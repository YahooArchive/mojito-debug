var express = require('express'),
    libmojito = require('mojito'),
    app = express();

app.set('port', process.env.PORT || 8666);

libmojito.extend(app);

app.use(libmojito.middleware());
app.use(require('./node_modules/mojito-debug/middleware/mojito-debug.js')({
    Y: app.mojito.Y,
    store: app.mojito.store
}));
app.mojito.attachRoutes();

app.listen(app.get('port'));
