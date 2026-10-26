CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- First account to sign up becomes the admin
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

CREATE TABLE public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timezone text NOT NULL DEFAULT 'Africa/Casablanca',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin updates settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.app_settings (id) VALUES (1);

CREATE TABLE public.smes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.smes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.smes TO authenticated;
GRANT ALL ON public.smes TO service_role;
ALTER TABLE public.smes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smes readable" ON public.smes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin inserts smes" ON public.smes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates smes" ON public.smes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes smes" ON public.smes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SAMPLE SME NAMES: replace via Admin > SME Management
INSERT INTO public.smes (name) VALUES
 ('Amina El Idrissi'),('Youssef Benali'),('Sara Haddad'),('Omar Tazi'),
 ('Lina Chraibi'),('Karim Alaoui'),('Nadia Fassi'),('Hamza Berrada'),
 ('Imane Kettani'),('Mehdi Squalli');

CREATE TABLE public.breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sme_id uuid REFERENCES public.smes(id) ON DELETE SET NULL,
  sme_name text NOT NULL,
  floor int NOT NULL CHECK (floor IN (3,4)),
  break_type text NOT NULL CHECK (break_type IN ('short','lunch')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_by text,
  business_date date NOT NULL
);
CREATE INDEX breaks_active_idx ON public.breaks (floor) WHERE ended_at IS NULL;
CREATE INDEX breaks_date_idx ON public.breaks (business_date);
CREATE UNIQUE INDEX breaks_one_active_per_sme ON public.breaks (sme_id) WHERE ended_at IS NULL;
GRANT SELECT ON public.breaks TO anon, authenticated;
GRANT ALL ON public.breaks TO service_role;
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "breaks readable" ON public.breaks FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.current_business_date()
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (now() AT TIME ZONE (SELECT timezone FROM public.app_settings WHERE id = 1))::date
$$;

CREATE OR REPLACE FUNCTION public.server_now()
RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT now() $$;

-- Closes breaks left open from a previous business day
CREATE OR REPLACE FUNCTION public.daily_rollover()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.breaks SET ended_at = now(), ended_by = 'Auto (daily reset)'
  WHERE ended_at IS NULL AND business_date < public.current_business_date();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.start_break(_sme_id uuid, _floor int, _break_type text)
RETURNS public.breaks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.smes; cnt int; r public.breaks;
BEGIN
  IF _floor NOT IN (3,4) THEN RAISE EXCEPTION 'Please choose a valid floor.'; END IF;
  IF _break_type NOT IN ('short','lunch') THEN RAISE EXCEPTION 'Please choose a valid break type.'; END IF;
  PERFORM public.daily_rollover();
  PERFORM pg_advisory_xact_lock(424242, _floor);
  SELECT * INTO s FROM public.smes WHERE id = _sme_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'This SME is not available.'; END IF;
  IF EXISTS (SELECT 1 FROM public.breaks WHERE sme_id = _sme_id AND ended_at IS NULL) THEN
    RAISE EXCEPTION '% is already on break.', s.name;
  END IF;
  SELECT count(*) INTO cnt FROM public.breaks WHERE floor = _floor AND ended_at IS NULL;
  IF cnt >= 4 THEN
    RAISE EXCEPTION 'Floor % is full (4 of 4 spots used). Please wait for someone to return.', _floor;
  END IF;
  INSERT INTO public.breaks (sme_id, sme_name, floor, break_type, business_date)
  VALUES (s.id, s.name, _floor, _break_type, public.current_business_date())
  RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.end_break(_break_id uuid, _ended_by text)
RETURNS public.breaks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.breaks; who text;
BEGIN
  who := nullif(left(trim(coalesce(_ended_by,'')), 80), '');
  IF public.has_role(auth.uid(), 'admin') THEN who := coalesce(who, 'Admin'); END IF;
  UPDATE public.breaks SET ended_at = now(), ended_by = coalesce(who, 'Self')
  WHERE id = _break_id AND ended_at IS NULL RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'This break has already ended.'; END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_break(_break_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only.'; END IF;
  DELETE FROM public.breaks WHERE id = _break_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_clear_active()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only.'; END IF;
  UPDATE public.breaks SET ended_at = now(), ended_by = 'Admin (cleared)' WHERE ended_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_remove_break(uuid), public.admin_clear_active() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_remove_break(uuid), public.admin_clear_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_break(uuid,int,text), public.end_break(uuid,text), public.daily_rollover(), public.server_now(), public.current_business_date() TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.breaks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smes;