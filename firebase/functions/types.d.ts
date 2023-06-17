export interface GOauthCodeResponse {
    code: string;
    scope: string;
    authuser: string;
    prompt: string;
}
export interface GOauthTokenReponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}
export interface GOpenidTokenResponse extends GOauthTokenReponse {
    id_token: string;
    refresh_token?: string;
    error?: string;
}
export interface FSToken {
    accessToken: string;
    exp: number;
    refreshToken: string;
}
export interface Token {
    user: string;
    iat: number;
    exp: number;
    iss: string;
}

export interface UserData {
    jwt: string;
    id: string;
    pass: string;
    secret: string;
    root: string;
}

export interface User {
    root: string;
    token: string;
    sub: string;
    extoken: string;
}

export interface HandleUser {
    status: number;
    user?: { token: string; root: string };
}

export interface ImgMeta {
    name?: string;
    mimeType?: string;
    description?: string;
    parents?: [string];
    appProperties?: {
        origin: string;
        src: string;
    };
}

export interface CreateResourceResponse {
    kind: string;
    id: string;
    name: string;
    mimeType: string;
}

export interface DirListResponse {
    files: { id: string; name: string }[];
}
