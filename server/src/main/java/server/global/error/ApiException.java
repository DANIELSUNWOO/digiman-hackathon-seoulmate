package server.global.error;

import lombok.Getter;

/** 서비스 코드에서 throw new ApiException(ErrorCode.XXX) 하면 명세서 형식으로 응답된다. */
@Getter
public class ApiException extends RuntimeException {
    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
