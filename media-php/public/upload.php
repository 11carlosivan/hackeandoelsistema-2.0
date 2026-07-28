<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function load_media_config(): array
{
    $configFile = dirname(__DIR__) . '/media-config.php';
    $fileConfig = is_file($configFile) ? require $configFile : [];

    return array_merge([
        'secret' => getenv('HES_MEDIA_SECRET') ?: '',
        'public_base_url' => getenv('HES_MEDIA_PUBLIC_BASE_URL') ?: '',
        'upload_root' => getenv('HES_MEDIA_UPLOAD_ROOT') ?: (__DIR__ . '/uploads/cms'),
        'public_base_path' => getenv('HES_MEDIA_PUBLIC_BASE_PATH') ?: '/uploads/cms',
        'max_bytes' => (int) (getenv('HES_MEDIA_MAX_BYTES') ?: 8388608),
        'clock_tolerance_seconds' => 300,
    ], is_array($fileConfig) ? $fileConfig : []);
}

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function header_value(string $name): string
{
    $serverName = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    $redirectName = 'REDIRECT_' . $serverName;

    return trim((string) ($_SERVER[$serverName] ?? $_SERVER[$redirectName] ?? ''));
}

function bearer_token(): string
{
    $authorization = header_value('Authorization');

    if (stripos($authorization, 'Bearer ') !== 0) {
        return '';
    }

    return trim(substr($authorization, 7));
}

function sanitize_file_stem(string $value): string
{
    $stem = pathinfo($value, PATHINFO_FILENAME) ?: 'archivo';
    $stem = function_exists('iconv') ? (iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $stem) ?: $stem) : $stem;
    $stem = strtolower($stem);
    $stem = preg_replace('/[^a-z0-9]+/', '-', $stem) ?: 'archivo';
    $stem = trim($stem, '-');
    return substr($stem !== '' ? $stem : 'archivo', 0, 80);
}

function detect_public_base_url(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

    return $scheme . '://' . $host;
}

$config = load_media_config();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'method_not_allowed']);
}

if (!is_string($config['secret']) || strlen($config['secret']) < 32) {
    respond(500, ['error' => 'media_secret_not_configured']);
}

if (!hash_equals($config['secret'], bearer_token())) {
    respond(401, ['error' => 'unauthorized']);
}

$timestamp = header_value('X-HES-Media-Timestamp');
$signature = header_value('X-HES-Media-Signature');

if (!ctype_digit($timestamp) || abs(time() - (int) $timestamp) > (int) $config['clock_tolerance_seconds']) {
    respond(401, ['error' => 'invalid_timestamp']);
}

if (
    !isset($_FILES['file']) ||
    !is_array($_FILES['file']) ||
    !isset($_FILES['file']['tmp_name']) ||
    !is_string($_FILES['file']['tmp_name']) ||
    !is_uploaded_file($_FILES['file']['tmp_name'])
) {
    respond(400, ['error' => 'missing_file']);
}

$file = $_FILES['file'];
$size = (int) ($file['size'] ?? 0);

if ($size <= 0 || $size > (int) $config['max_bytes']) {
    respond(413, ['error' => 'invalid_file_size']);
}

$originalName = (string) ($_POST['filename'] ?? $file['name'] ?? 'archivo');
$declaredMime = (string) ($_POST['mimetype'] ?? $file['type'] ?? '');
$buffer = file_get_contents($file['tmp_name']);

if ($buffer === false) {
    respond(400, ['error' => 'unreadable_file']);
}

$expectedSignature = hash_hmac(
    'sha256',
    $timestamp . ':' . $originalName . ':' . $declaredMime . ':' . hash('sha256', $buffer),
    $config['secret']
);

if (!hash_equals($expectedSignature, $signature)) {
    respond(401, ['error' => 'invalid_signature']);
}

$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'video/mp4' => 'mp4',
    'audio/mpeg' => 'mp3',
    'audio/wav' => 'wav',
    'application/pdf' => 'pdf',
    'text/plain' => 'txt',
];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$actualMime = $finfo->file($file['tmp_name']) ?: '';

if (!isset($allowed[$actualMime]) || $declaredMime !== $actualMime) {
    respond(415, ['error' => 'unsupported_media_type']);
}

$extension = $allowed[$actualMime];
$year = gmdate('Y');
$month = gmdate('m');
$fileName = sanitize_file_stem($originalName) . '-' . bin2hex(random_bytes(6)) . '.' . $extension;
$uploadRoot = rtrim((string) $config['upload_root'], "/\\");
$targetDir = $uploadRoot . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . $month;

if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
    respond(500, ['error' => 'upload_dir_unavailable']);
}

$targetPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    respond(500, ['error' => 'upload_failed']);
}

$width = null;
$height = null;

if (substr($actualMime, 0, 6) === 'image/') {
    $dimensions = @getimagesize($targetPath);

    if (is_array($dimensions)) {
        $width = (int) $dimensions[0];
        $height = (int) $dimensions[1];
    }
}

$publicBasePath = '/' . trim((string) $config['public_base_path'], '/');
$publicPath = $publicBasePath . '/' . $year . '/' . $month . '/' . $fileName;
$publicBaseUrl = rtrim((string) ($config['public_base_url'] ?: detect_public_base_url()), '/');

respond(201, [
    'data' => [
        'media' => [
            'url' => $publicBaseUrl . $publicPath,
            'path' => $publicPath,
            'mimeType' => $actualMime,
            'fileName' => $fileName,
            'fileSize' => filesize($targetPath) ?: $size,
            'width' => $width,
            'height' => $height,
        ],
    ],
]);
