-- Storage RLS policies for avatars bucket (Supabase wraps CREATE POLICY to support IF NOT EXISTS, but plain PG does not)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read avatars') THEN
    CREATE POLICY "Public read avatars" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth upload avatars') THEN
    CREATE POLICY "Auth upload avatars" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth update own avatars') THEN
    CREATE POLICY "Auth update own avatars" ON storage.objects
      FOR UPDATE TO authenticated USING (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth delete own avatars') THEN
    CREATE POLICY "Auth delete own avatars" ON storage.objects
      FOR DELETE TO authenticated USING (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
