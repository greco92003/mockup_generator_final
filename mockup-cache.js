const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Cache manager for mockups
 */
class MockupCache {
  /**
   * Initialize the mockup cache
   * @param {string} cacheDir - Directory to store cache files
   * @param {number} maxCacheAge - Maximum age of cache files in milliseconds (default: 7 days)
   */
  constructor(cacheDir, maxCacheAge = 7 * 24 * 60 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.maxCacheAge = maxCacheAge;
    this.ensureCacheDir();
    this.memoryCache = new Map();
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
        console.log(`Mockup cache directory created: ${this.cacheDir}`);
      }
    } catch (error) {
      console.error(`Error creating mockup cache directory: ${error.message}`);
    }
  }

  /**
   * Generate a cache key for a mockup request
   * @param {string} logoUrl - URL of the logo
   * @param {string} name - Name for the mockup
   * @param {string} email - Email for the mockup
   * @returns {string} - Cache key
   */
  generateKey(logoUrl, name, email) {
    const data = `${logoUrl}|${name}|${email}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Check if a mockup exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if mockup exists in cache
   */
  exists(key) {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      if (Date.now() - entry.timestamp < this.maxCacheAge) {
        return true;
      }
      // Entry expired, remove from memory cache
      this.memoryCache.delete(key);
    }
    
    // Check file cache
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    return fs.existsSync(cachePath);
  }

  /**
   * Get a mockup from the cache
   * @param {string} key - Cache key
   * @returns {object|null} - Mockup data or null if not found
   */
  get(key) {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      if (Date.now() - entry.timestamp < this.maxCacheAge) {
        console.log(`Memory cache hit: ${key}`);
        this.stats.hits++;
        return entry.data;
      }
      // Entry expired, remove from memory cache
      this.memoryCache.delete(key);
    }
    
    // Check file cache
    const cachePath = path.join(this.cacheDir, `${key}.json`);
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
        
        // Read and parse the cache file
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        
        // Store in memory cache for faster access next time
        this.memoryCache.set(key, {
          data,
          timestamp: Date.now()
        });
        
        console.log(`File cache hit: ${cachePath}`);
        this.stats.hits++;
        return data;
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
   * Store a mockup in the cache
   * @param {string} key - Cache key
   * @param {object} data - Mockup data
   */
  store(key, data) {
    // Store in memory cache
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Store in file cache
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    try {
      fs.writeFileSync(cachePath, JSON.stringify(data));
      console.log(`Mockup stored in cache: ${cachePath}`);
      this.stats.stored++;
    } catch (error) {
      console.error(`Error storing mockup in cache: ${error.message}`);
    }
  }

  /**
   * Clean expired entries from the cache
   */
  cleanExpired() {
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (Date.now() - entry.timestamp > this.maxCacheAge) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clean file cache
    try {
      const files = fs.readdirSync(this.cacheDir);
      let removed = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
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
      
      console.log(`Cleaned ${removed} expired mockups from cache`);
    } catch (error) {
      console.error(`Error cleaning mockup cache: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memoryCacheSize: this.memoryCache.size
    };
  }
}

module.exports = MockupCache;
