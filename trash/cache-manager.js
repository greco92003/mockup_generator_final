const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Cache manager for storing and retrieving converted files
 * Uses file system for storage with MD5 hashing for cache keys
 */
class CacheManager {
  /**
   * Initialize the cache manager
   * @param {string} cacheDir - Directory to store cache files
   * @param {number} maxCacheAge - Maximum age of cache files in milliseconds (default: 7 days)
   */
  constructor(cacheDir, maxCacheAge = 7 * 24 * 60 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.maxCacheAge = maxCacheAge;
    this.ensureCacheDir();
    this.stats = {
      hits: 0,
      misses: 0,
      stored: 0
    };
  }

  /**
   * Ensure the cache directory exists
   */
  ensureCacheDir() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
        console.log(`Cache directory created: ${this.cacheDir}`);
      }
    } catch (error) {
      console.error(`Error creating cache directory: ${error.message}`);
    }
  }

  /**
   * Generate a cache key from a buffer using MD5 hash
   * @param {Buffer} buffer - Buffer to hash
   * @param {string} filename - Original filename
   * @returns {string} - Cache key
   */
  generateKey(buffer, filename) {
    const hash = crypto.createHash('md5');
    hash.update(buffer);
    
    // Include the file extension in the key
    const extension = path.extname(filename).toLowerCase();
    const hashValue = hash.digest('hex');
    
    return `${hashValue}${extension}`;
  }

  /**
   * Get the path to a cached file
   * @param {string} key - Cache key
   * @returns {string} - Path to cached file
   */
  getCachePath(key) {
    return path.join(this.cacheDir, key);
  }

  /**
   * Check if a file exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if file exists in cache
   */
  exists(key) {
    const cachePath = this.getCachePath(key);
    return fs.existsSync(cachePath);
  }

  /**
   * Get a file from the cache
   * @param {string} key - Cache key
   * @returns {string|null} - Path to cached file or null if not found
   */
  get(key) {
    const cachePath = this.getCachePath(key);
    
    if (fs.existsSync(cachePath)) {
      try {
        const stats = fs.statSync(cachePath);
        const fileAge = Date.now() - stats.mtimeMs;
        
        // Check if file is too old
        if (fileAge > this.maxCacheAge) {
          console.log(`Cache file expired: ${cachePath}`);
          try {
            fs.unlinkSync(cachePath);
          } catch (error) {
            console.error(`Error removing expired cache file: ${error.message}`);
          }
          this.stats.misses++;
          return null;
        }
        
        console.log(`Cache hit: ${cachePath}`);
        this.stats.hits++;
        return cachePath;
      } catch (error) {
        console.error(`Error reading cache file: ${error.message}`);
        this.stats.misses++;
        return null;
      }
    }
    
    console.log(`Cache miss: ${key}`);
    this.stats.misses++;
    return null;
  }

  /**
   * Store a file in the cache
   * @param {string} key - Cache key
   * @param {string} filePath - Path to file to store
   * @returns {string} - Path to cached file
   */
  store(key, filePath) {
    const cachePath = this.getCachePath(key);
    
    try {
      // Copy the file to the cache
      fs.copyFileSync(filePath, cachePath);
      console.log(`File stored in cache: ${cachePath}`);
      this.stats.stored++;
      return cachePath;
    } catch (error) {
      console.error(`Error storing file in cache: ${error.message}`);
      return filePath; // Return original path if caching fails
    }
  }

  /**
   * Store a buffer in the cache
   * @param {string} key - Cache key
   * @param {Buffer} buffer - Buffer to store
   * @returns {string} - Path to cached file
   */
  storeBuffer(key, buffer) {
    const cachePath = this.getCachePath(key);
    
    try {
      // Write the buffer to the cache
      fs.writeFileSync(cachePath, buffer);
      console.log(`Buffer stored in cache: ${cachePath}`);
      this.stats.stored++;
      return cachePath;
    } catch (error) {
      console.error(`Error storing buffer in cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Clean expired files from the cache
   */
  cleanExpired() {
    try {
      const files = fs.readdirSync(this.cacheDir);
      let removed = 0;
      
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = Date.now() - stats.mtimeMs;
        
        if (fileAge > this.maxCacheAge) {
          try {
            fs.unlinkSync(filePath);
            removed++;
          } catch (error) {
            console.error(`Error removing expired cache file: ${error.message}`);
          }
        }
      }
      
      console.log(`Cleaned ${removed} expired files from cache`);
    } catch (error) {
      console.error(`Error cleaning cache: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }
}

module.exports = CacheManager;
