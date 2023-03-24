export interface GOauthTokenReponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}

export interface FSToken {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
}

export interface UserData {
    jwt: string;
    id: string;
    pass: string;
    secret: string;
}

export interface ImgMeta {
    name?: string;
    mimeType?: string;
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
