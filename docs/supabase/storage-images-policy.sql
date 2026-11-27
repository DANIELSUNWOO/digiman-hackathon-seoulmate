-- 서울메이트 Supabase Storage `images` 버킷 설정 (API 명세서 v1.7 UPLOAD-01)
-- 실행 위치: Supabase 대시보드 → SQL Editor
-- 적용 기록: 2026-11-27 seoulmate 프로젝트에 적용함 (서버 B). 프로젝트를 새로 만들 때만 다시 실행한다.
-- 업로드 경로 규칙: {purpose}/{userId}/{uuid}.jpg   (purpose = profile / spot / visit / album)
--
-- 실행 전 확인: Storage → Policies 에 images 버킷 정책이 이미 있으면 진용 님과 먼저 맞춘다.
-- 같은 이름의 정책이 있으면 CREATE POLICY 가 에러를 내고 아무것도 바뀌지 않는다.

-- 1) 버킷: 공개 읽기, 1장 최대 5MB, 이미지 형식만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2) 업로드: 로그인한 사용자가 자기 userId 폴더에만, 정해진 purpose 폴더에만
create policy "images_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] in ('profile', 'spot', 'visit', 'album')
  and (storage.foldername(name))[2] = (select auth.uid()::text)
);

-- 읽기는 버킷이 public 이라 getPublicUrl() 주소로 누구나 볼 수 있다 (별도 SELECT 정책 불필요).
-- 수정·삭제 정책은 두지 않는다: 앱은 새 파일만 올리고, 사진 교체는 새 URL을 API에 보낸다.

-- 3) 확인용 (실행 후 결과에 정책 1개가 보이면 정상)
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'images_%';
