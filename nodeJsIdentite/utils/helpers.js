// Fonction pour générer un code de vérification à 6 chiffres
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
    generateVerificationCode
};
