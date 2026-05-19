<?php
function campus_secret(): string {
    $secret = getenv('APP_SECRET') ?: '';
    if ($secret === '') {
        $fallbackSource = implode('|', [
            getenv('PG_PASSWORD') ?: '',
            getenv('PG_DB_NAME') ?: '',
            getenv('PG_USERNAME') ?: '',
        ]);

        if (trim($fallbackSource, '|') !== '') {
            error_log('[Campus Auth] APP_SECRET no esta definido. Usando secreto derivado temporal; configura APP_SECRET y recrea el contenedor.');
            return hash('sha256', $fallbackSource);
        }

        if ((getenv('APP_ENV') ?: 'production') === 'development') {
            return 'development-only-secret-change-me';
        }

        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'Servicio no disponible. Falta configurar APP_SECRET.']);
        exit();
    }
    return $secret;
}

function b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string|false {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'), true);
}

function issue_token(array $user): string {
    $payload = [
        'sub' => (string)$user['id'],
        'role' => $user['role'],
        'email' => $user['email'],
        'iat' => time(),
        'exp' => time() + (8 * 60 * 60),
    ];
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $body = b64url_encode(json_encode($header)) . '.' . b64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $body, campus_secret(), true);
    return $body . '.' . b64url_encode($signature);
}

function current_auth_user(): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$header && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return null;
    }

    $parts = explode('.', $matches[1]);
    if (count($parts) !== 3) {
        return null;
    }

    [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
    $body = $encodedHeader . '.' . $encodedPayload;
    $expected = b64url_encode(hash_hmac('sha256', $body, campus_secret(), true));
    if (!hash_equals($expected, $encodedSignature)) {
        return null;
    }

    $payloadRaw = b64url_decode($encodedPayload);
    if ($payloadRaw === false) {
        return null;
    }

    $payload = json_decode($payloadRaw, true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
        return null;
    }

    return $payload;
}

function require_auth(): array {
    $user = current_auth_user();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sesion no valida o expirada.']);
        exit();
    }
    return $user;
}

function require_roles(array $roles): array {
    $user = require_auth();
    if (!in_array($user['role'] ?? '', $roles, true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No tienes permisos para esta accion.']);
        exit();
    }
    return $user;
}
?>
