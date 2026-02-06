const DB_NAME = 'wuxue_data_cache';
const DB_VERSION = 1;
const STORE_NAME = 'json_data';

let dbPromise = null;

function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB 打开失败:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'filename' });
            }
        };
    });

    return dbPromise;
}

async function getData(filename) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(filename);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.data);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error(`读取 ${filename} 失败:`, request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error(`获取数据失败 ${filename}:`, error);
        return null;
    }
}

async function saveData(filename, data) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({ filename, data, timestamp: Date.now() });

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error(`保存 ${filename} 失败:`, request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error(`保存数据失败 ${filename}:`, error);
        return false;
    }
}

async function checkVersion() {
    try {
        const localVersion = await getData('version.json');
        const response = await fetch('data/version.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const serverVersion = await response.json();

        if (!localVersion) {
            return { needUpdate: true, serverVersion };
        }

        const needUpdate = localVersion.version !== serverVersion.version;
        return { needUpdate, localVersion, serverVersion };
    } catch (error) {
        console.error('检查版本失败:', error);
        return { needUpdate: true, error };
    }
}

async function fetchAndCacheData(filename) {
    try {
        const response = await fetch(`data/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        await saveData(filename, data);
        return data;
    } catch (error) {
        console.error(`下载 ${filename} 失败:`, error);
        return null;
    }
}

async function loadAllData(filenames) {
    const versionInfo = await checkVersion();
    const result = {};

    if (versionInfo.needUpdate) {
        console.log('检测到新版本，开始更新缓存...');

        await fetchAndCacheData('version.json');

        for (const filename of filenames) {
            const data = await fetchAndCacheData(filename);
            if (data) {
                result[filename] = data;
            }
        }

        console.log('缓存更新完成');
    } else {
        console.log('使用本地缓存');

        for (const filename of filenames) {
            const data = await getData(filename);
            if (data) {
                result[filename] = data;
            } else {
                console.warn(`${filename} 在缓存中不存在，从服务器下载...`);
                const data = await fetchAndCacheData(filename);
                if (data) {
                    result[filename] = data;
                }
            }
        }
    }

    return result;
}

async function clearCache() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('缓存已清除');
                resolve(true);
            };

            request.onerror = () => {
                console.error('清除缓存失败:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('清除缓存失败:', error);
        return false;
    }
}

async function getCacheInfo() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const items = request.result;
                let totalSize = 0;
                items.forEach(item => {
                    const jsonStr = JSON.stringify(item.data);
                    totalSize += jsonStr.length * 2;
                });
                resolve({
                    count: items.length,
                    size: totalSize,
                    items: items.map(item => ({
                        filename: item.filename,
                        timestamp: new Date(item.timestamp).toLocaleString()
                    }))
                });
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('获取缓存信息失败:', error);
        return null;
    }
}

export {
    initDB,
    getData,
    saveData,
    checkVersion,
    fetchAndCacheData,
    loadAllData,
    clearCache,
    getCacheInfo
};
