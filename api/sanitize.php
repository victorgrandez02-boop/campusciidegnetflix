<?php
function sanitize_plain_text(?string $value, int $maxLength = 500): string {
    $clean = trim((string)$value);
    $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $clean);
    return mb_substr($clean, 0, $maxLength);
}

function is_remote_html_url(string $value): bool {
    return (bool)preg_match('/^https:\/\/[^\s<>"\']+$/i', trim($value));
}

function sanitize_html_material(string $html): string {
    if (is_remote_html_url($html)) {
        return trim($html);
    }

    $html = preg_replace('/<\s*(script|iframe|object|embed|form|input|button|textarea|select|style|link|meta|base)[^>]*>.*?<\s*\/\s*\1\s*>/is', '', $html);
    $html = preg_replace('/<\s*(script|iframe|object|embed|form|input|button|textarea|select|style|link|meta|base)[^>]*\/?>/is', '', $html);
    $html = preg_replace('/\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html);
    $html = preg_replace('/\s(href|src)\s*=\s*("[\s]*javascript:[^"]*"|\'[\s]*javascript:[^\']*\'|javascript:[^\s>]+)/i', '', $html);
    return trim($html);
}

function sanitize_material_payload(array $material): array {
    $type = strtoupper((string)($material['type'] ?? 'LINK'));
    $allowed = ['PDF', 'LINK', 'DRIVE', 'YOUTUBE', 'HTML'];
    if (!in_array($type, $allowed, true)) {
        $type = 'LINK';
    }

    $url = (string)($material['url'] ?? '');
    if ($type === 'HTML') {
        $url = sanitize_html_material($url);
    } else {
        $url = trim($url);
    }

    return [
        'title' => sanitize_plain_text($material['title'] ?? '', 150),
        'type' => $type,
        'url' => $url,
    ];
}
?>
