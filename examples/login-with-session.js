const { Sigaa, SigaaCookiesController } = require('sigaa-api');

const sigaaURL = new URL('https://sigaa.ifsc.edu.br');
const institution = 'IFSC';

const cookie = "" // coloque seu cookie JSESSIONID
const JSESSIONID = `JSESSIONID=${cookie}`;

const main = async () => {
        const cookiesController = new SigaaCookiesController();
        cookiesController.storeCookies(sigaaURL.hostname, [JSESSIONID]);

        const sigaa = new Sigaa({
            url: sigaaURL.href,
            institution,
            cookiesController
        });

        const http = sigaa.httpFactory.createHttp();
        const page = await http.get("/sigaa/vinculos.jsf");
        const account = await sigaa.accountFactory.getAccount(page);

        console.log('> Nome: ' + (await account.getName()));
        console.log('> Emails: ' + (await account.getEmails()).join(', '));
        console.log('> Url foto: ' + (await account.getProfilePictureURL()));
}

main().catch((err) => {
    if (err) console.log(err);
});