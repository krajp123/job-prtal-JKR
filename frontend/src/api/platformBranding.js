import axiosInstance from './axiosInstance';

const EMPTY_BRANDING = { siteName: '', logo: '' };
let memoryBranding = EMPTY_BRANDING;

function readCachedBranding() {
    return memoryBranding;
}

export function getCachedPlatformBranding() {
    return readCachedBranding();
}

export async function fetchPlatformBranding() {
    const { data } = await axiosInstance.get('/platform/settings');
    const branding = {
        siteName: typeof data.siteName === 'string' ? data.siteName.trim() : '',
        logo: typeof data.logo === 'string' ? data.logo : '',
    };
    memoryBranding = branding;
    return branding;
}
