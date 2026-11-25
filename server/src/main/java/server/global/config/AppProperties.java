package server.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "seoulmate")
public record AppProperties(boolean demoMode, Supabase supabase) {
    /** issuer = https://<project-ref>.supabase.co/auth/v1, jwksUrl = issuer + /.well-known/jwks.json */
    public record Supabase(String issuer, String jwksUrl) {}
}
