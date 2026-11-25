package server.global.security;

import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import server.global.error.ApiException;
import server.global.error.ErrorCode;
import server.user.domain.User;
import server.user.repository.UserRepository;

import java.util.UUID;

/**
 * 컨트롤러 파라미터 TokenUser / AuthUser 를 채운다.
 * Supabase 토큰은 SecurityConfig 에서 JWKS 로 서명·만료·발급자를 이미 검증한 상태다.
 * 역할(여행자/메이트)은 토큰에 없으므로 매 요청 USERS 에서 읽는다 → 탈퇴한 회원의 남은 토큰도 여기서 막힌다.
 */
@Component
@RequiredArgsConstructor
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    private final UserRepository userRepository;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        Class<?> type = parameter.getParameterType();
        return type == AuthUser.class || type == TokenUser.class;
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav,
                                  NativeWebRequest request, WebDataBinderFactory binderFactory) {
        TokenUser token = currentToken();
        if (parameter.getParameterType() == TokenUser.class) return token;

        User user = userRepository.findById(token.id())
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_REGISTERED));
        if (!user.isActive()) throw new ApiException(ErrorCode.WITHDRAWN_USER);
        return new AuthUser(user.getId(), user.getRole(), token.email());
    }

    private TokenUser currentToken() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) throw new ApiException(ErrorCode.UNAUTHORIZED);
        try {
            return new TokenUser(UUID.fromString(jwt.getSubject()), jwt.getClaimAsString("email"));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
    }
}
