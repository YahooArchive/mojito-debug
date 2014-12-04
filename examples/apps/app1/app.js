var express = require('express'),
    libmojito = require('mojito'),
    app = express();

app.set('port', process.env.PORT || 8666);

libmojito.extend(app);

app.use(require('./node_modules/mojito-debug/middleware/mojito-debug.js')({
    Y: app.mojito.Y,
    store: app.mojito.store
}));
app.use(libmojito.middleware());
app.mojito.attachRoutes();

app.listen(app.get('port'));
