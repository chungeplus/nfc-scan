function getRuntimeConfig() {
    try {
        return typeof __wxConfig === 'object' && __wxConfig ? __wxConfig : null;
    } catch (error) {
        return null;
    }
}

function normalizeRoutePath(path) {
    return String(path || '').trim().replace(/^\/+/, '');
}

function getConfiguredPages() {
    const config = getRuntimeConfig();
    return config && Array.isArray(config.pages) ? config.pages : [];
}

function getConfiguredTabPages() {
    const config = getRuntimeConfig();
    const list = config && config.tabBar && Array.isArray(config.tabBar.list)
        ? config.tabBar.list
        : [];

    return list
        .map(item => normalizeRoutePath(item && item.pagePath))
        .filter(Boolean);
}

function hasConfiguredRoute(path) {
    const target = normalizeRoutePath(path);
    if (!target) {
        return false;
    }

    return getConfiguredPages().includes(target) || getConfiguredTabPages().includes(target);
}

function resolveMiniProgramRoute(path) {
    const cleanPath = normalizeRoutePath(path);

    if (!cleanPath) {
        return '/';
    }

    const plainPath = cleanPath.replace(/^miniprogram\//, '');
    const prefixedPath = cleanPath.startsWith('miniprogram/')
        ? cleanPath
        : `miniprogram/${cleanPath}`;

    if (hasConfiguredRoute(cleanPath)) {
        return `/${cleanPath}`;
    }

    if (hasConfiguredRoute(plainPath)) {
        return `/${plainPath}`;
    }

    if (hasConfiguredRoute(prefixedPath)) {
        return `/${prefixedPath}`;
    }

    return `/${cleanPath}`;
}

module.exports = {
    resolveMiniProgramRoute,
};
