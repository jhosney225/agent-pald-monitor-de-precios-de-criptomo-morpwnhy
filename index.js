```javascript
const https = require('https');
const EventEmitter = require('events');

// Clase para gestionar alertas de precios
class PriceAlert extends EventEmitter {
  constructor(symbol, targetPrice, condition = 'above') {
    super();
    this.symbol = symbol;
    this.targetPrice = targetPrice;
    this.condition = condition; // 'above' o 'below'
    this.triggered = false;
  }

  checkPrice(currentPrice) {
    const conditionMet =
      (this.condition === 'above' && currentPrice >= this.targetPrice) ||
      (this.condition === 'below' && currentPrice <= this.targetPrice);

    if (conditionMet && !this.triggered) {
      this.triggered = true;
      this.emit('alert', {
        symbol: this.symbol,
        targetPrice: this.targetPrice,
        currentPrice: currentPrice,
        condition: this.condition,
        timestamp: new Date().toISOString()
      });
    } else if (!conditionMet) {
      this.triggered = false;
    }

    return conditionMet;
  }
}

// Clase para monitorear precios
class CryptoPriceMonitor {
  constructor() {
    this.alerts = new Map();
    this.prices = new Map();
    this.monitoringActive = false;
    this.updateInterval = null;
  }

  addAlert(symbol, targetPrice, condition = 'above') {
    const key = `${symbol}-${targetPrice}-${condition}`;
    const alert = new PriceAlert(symbol, targetPrice, condition);

    alert.on('alert', (alertData) => {
      this.handleAlert(alertData);
    });

    this.alerts.set(key, alert);
    console.log(`✓ Alerta agregada: ${symbol} ${condition} $${targetPrice}`);
    return alert;
  }

  removeAlert(symbol, targetPrice, condition = 'above') {
    const key = `${symbol}-${targetPrice}-${condition}`;
    if (this.alerts.has(key)) {
      this.alerts.delete(key);
      console.log(`✓ Alerta eliminada: ${symbol}`);
      return true;
    }
    return false;
  }

  fetchPrice(symbol) {
    return new Promise((resolve, reject) => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`;

      https
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const price = parsed[symbol]?.usd;
              if (price) {
                resolve(price);
              } else {
                reject(new Error(`No price data for ${symbol}`));
              }
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
  }

  async updatePrices(symbols) {
    try {
      for (const symbol of symbols) {
        const price = await this.fetchPrice(symbol);
        this.prices.set(symbol, price);

        // Verificar todas las alertas para este símbolo
        for (const [key, alert] of this.alerts.entries()) {
          if (alert.symbol === symbol) {
            alert.checkPrice(price);
          }
        }
      }
    } catch (error) {
      console.error('Error actualizando precios:', error.message);
    }
  }

  handleAlert(alertData) {
    const { symbol, targetPrice, currentPrice, condition, timestamp } = alertData;
    console.log('\n🚨 ALERTA ACTIVADA 🚨');
    console.log(`Cripto: ${symbol.toUpperCase()}`);
    console.log(`Precio actual: $${currentPrice.toFixed(2)}`);
    console.log(`Condición: ${condition} $${targetPrice.toFixed(2)}`);
    console.log(`Hora: ${timestamp}`);
    console.log('---');
  }

  displayPrices() {
    if (this.prices.size === 0) {
      console.log('Sin datos de precios aún.');
      return;
    }

    console.log('\n📊 PRECIOS ACTUALES');
    console.log('═══════════════════════════════════');
    for (const [symbol, price] of this.prices.entries()) {
      console.log(`${symbol.toUpperCase().padEnd(10)} | $${price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`);
    }
    console.log('═══════════════════════════════════\n');
  }

  displayAlerts() {
    if (this.alerts.size === 0) {
      console.log('Sin alertas configuradas.');
      return;
    }

    console.log('\n🔔 ALERTAS CONFIGURADAS');
    console.log('═══════════════════════════════════');
    for (const [key, alert] of this.alerts.entries()) {
      const status = alert.triggered ? '✓ ACTIVA' : '○ en espera';
      console.log(
        `${alert.symbol.toUpperCase().padEnd(10)} | ${alert.condition.padEnd(6)} $${alert.targetPrice.toFixed(2).padEnd(10)} [${status}]`
      );
    }
    console.log('═══════════════════════════════════\n');
  }

  startMonitoring(symbols, intervalSeconds = 30) {
    if (this.monitoringActive) {
      console.log('El monitoreo ya está activo.');
      return;