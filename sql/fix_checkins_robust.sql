-- Fix Geographic Checkins Table and Functions
BEGIN;

-- 1. Ensure geographic_checkins table exists and has correct schema
CREATE TABLE IF NOT EXISTS public.geographic_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    manifestation_id UUID REFERENCES public.manifestations(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    points_awarded INTEGER DEFAULT 0,
    CONSTRAINT check_target CHECK (
        (manifestation_id IS NOT NULL AND event_id IS NULL) OR 
        (manifestation_id IS NULL AND event_id IS NOT NULL)
    )
);

-- 2. Ensure manifestation_rsvp table exists
CREATE TABLE IF NOT EXISTS public.manifestation_rsvp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    manifestation_id UUID REFERENCES public.manifestations(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('vai', 'talvez', 'nao_vai')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, manifestation_id)
);

-- 3. Create or Replace calculate_distance function (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    R CONSTANT DOUBLE PRECISION := 6371; -- Radius of the Earth in km
    dLat DOUBLE PRECISION;
    dLon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    a := sin(dLat / 2) * sin(dLat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon / 2) * sin(dLon / 2);
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    RETURN R * c;
END;
$$;

-- 4. Grant permissions
GRANT ALL ON TABLE public.geographic_checkins TO authenticated;
GRANT ALL ON TABLE public.geographic_checkins TO service_role;
GRANT ALL ON TABLE public.manifestation_rsvp TO authenticated;
GRANT ALL ON TABLE public.manifestation_rsvp TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_distance TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_distance TO service_role;

-- 5. Fix RLS Policies
ALTER TABLE public.geographic_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifestation_rsvp ENABLE ROW LEVEL SECURITY;

-- Policies for geographic_checkins
DROP POLICY IF EXISTS "Users can view their own checkins" ON public.geographic_checkins;
CREATE POLICY "Users can view their own checkins" ON public.geographic_checkins
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.geographic_checkins;
CREATE POLICY "Users can insert their own checkins" ON public.geographic_checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for manifestation_rsvp
DROP POLICY IF EXISTS "Users can view all RSVPs" ON public.manifestation_rsvp;
CREATE POLICY "Users can view all RSVPs" ON public.manifestation_rsvp
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own RSVPs" ON public.manifestation_rsvp;
CREATE POLICY "Users can manage their own RSVPs" ON public.manifestation_rsvp
    FOR ALL USING (auth.uid() = user_id);

COMMIT;
