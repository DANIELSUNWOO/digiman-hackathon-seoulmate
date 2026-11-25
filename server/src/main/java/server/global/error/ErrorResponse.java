package server.global.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(int status, String code, String message, List<FieldError> fieldErrors) {

    public record FieldError(String field, String reason) {}

    public static ErrorResponse of(ErrorCode code) {
        return new ErrorResponse(code.getStatus().value(), code.name(), code.getMessage(), null);
    }

    public static ErrorResponse validation(List<FieldError> fieldErrors) {
        ErrorCode c = ErrorCode.VALIDATION_ERROR;
        return new ErrorResponse(c.getStatus().value(), c.name(), c.getMessage(), fieldErrors);
    }
}
