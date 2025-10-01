function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    // Si la requête attend du JSON (API)
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        res.status(401).json({ error: 'Non autorisé', redirectTo: '/login' });
    } else {
        // Pour les requêtes normales (pages web)
        req.flash('error_msg', 'Veuillez vous connecter pour accéder à cette page');
        res.redirect('/login');
    }
}

module.exports = {
    isAuthenticated
};
