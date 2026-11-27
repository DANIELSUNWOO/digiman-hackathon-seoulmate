-- 디자인 11/26 (M-02): 메이트는 휴대폰 본인인증으로 가입하고 여권 단계가 없다.
-- 이제 회원 등록(AUTH-01) 때 바로 VERIFIED 가 되므로, 이미 가입해서 인증 전인 메이트도 맞춰 둔다
UPDATE users SET verify_status = 'VERIFIED' WHERE role = 'MATE' AND verify_status <> 'VERIFIED';
