const promClient = require('prom-client');

// Initialize the default metrics (CPU, RAM, etc)
promClient.collectDefaultMetrics();

// Define custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

const httpErrorsTotal = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'code']
});

const activeRequests = new promClient.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests'
});

const metricsMiddleware = (req, res, next) => {
  activeRequests.inc();
  const start = process.hrtime();
  
  res.on('finish', () => {
    activeRequests.dec();
    
    // Convert duration to seconds
    const diff = process.hrtime(start);
    const time = diff[0] + diff[1] / 1e9;
    
    // Use the route path if available, else use originalUrl
    const route = req.route ? req.route.path : req.originalUrl.split('?')[0];

    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      code: res.statusCode
    });

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc({
        method: req.method,
        route: route,
        code: res.statusCode
      });
    }

    httpRequestDurationMicroseconds.observe(
      {
        method: req.method,
        route: route,
        code: res.statusCode
      },
      time
    );
  });
  
  next();
};

const getMetrics = async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

module.exports = {
  metricsMiddleware,
  getMetrics
};
