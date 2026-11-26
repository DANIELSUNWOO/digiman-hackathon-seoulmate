package server.global.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import server.global.security.JsonAuthHandlers;

import java.util.Collection;

/**
 * Supabase 가 발급한 access token 을 JWKS(공개키)로 검증한다 (API 명세 v1.4 0-0).
 * 서명 + 만료 + 발급자(iss) + 대상(aud = authenticated) 을 모두 확인한다.
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final AppProperties props;
    private final JsonAuthHandlers jsonAuthHandlers;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)          // 쿠키가 아니라 Bearer 토큰만 쓰므로 CSRF 불필요
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o
                .jwt(j -> j.decoder(jwtDecoder()))
                .authenticationEntryPoint(jsonAuthHandlers))
            .exceptionHandling(e -> e
                .authenticationEntryPoint(jsonAuthHandlers)
                .accessDeniedHandler(jsonAuthHandlers));
        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(props.supabase().jwksUrl())
                // Supabase 비대칭 서명 키는 ES256(기본) 또는 RS256
                .jwsAlgorithms(algs -> {
                    algs.add(SignatureAlgorithm.ES256);
                    algs.add(SignatureAlgorithm.RS256);
                })
                .build();
        OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<Collection<String>>("aud",
                aud -> aud != null && aud.contains("authenticated"));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(props.supabase().issuer()), audience));
        return decoder;
    }
}
