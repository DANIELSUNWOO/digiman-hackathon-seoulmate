package server.global.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import server.global.error.ErrorCode;

import java.io.IOException;

/** 토큰 없음·만료·위조 → 401, 권한 없음 → 403 을 명세서 JSON 형식으로 (Jackson 버전과 무관하게 직접 작성) */
@Component
public class JsonAuthHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException e) throws IOException {
        write(res, ErrorCode.UNAUTHORIZED);
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res, AccessDeniedException e) throws IOException {
        write(res, ErrorCode.ROLE_FORBIDDEN);
    }

    private void write(HttpServletResponse res, ErrorCode code) throws IOException {
        res.setStatus(code.getStatus().value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"status\":" + code.getStatus().value() + ",\"code\":\"" + code.name()
                + "\",\"message\":\"" + code.getMessage().replace("\"", "'") + "\"}");
    }
}
