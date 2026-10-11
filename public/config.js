window.MPU_CONFIG = {
  environment: location.hostname.includes('mpuwdc.web.app') ? 'prod' : 'dev',
  projectIds: { dev: 'mpuwdc-dev', prod: 'mpuwdc' },
  authDevBypass: true,
  bootstrapChairmanEmails: ['dunkas@gmail.com'],
  zelleEmail: 'mpuwdcmetroareainc@gmail.com',
  legacyPortalUrl: 'https://script.google.com/macros/s/AKfycbzAA5VH5g4ZaXtbU8cucsYVOrwve7JB6w_p9AwU9gl5TKgQGEF6fhdkgMY6l2t4vD9h7g/exec',
  knowRulesUrl: '',
  crashCourseUrl: '',
  candidatePortalUrl: '',
  appsScriptPaymentEndpoint: '',
  paymentSheetUrl: '',
  voterRegisterSheetUrl: '',
  candidateSheetUrl: '',
  firebase: {
    // Optional manual override. On Firebase Hosting, Build 10 automatically discovers
    // the active project's web configuration from /__/firebase/init.json.
    dev: { apiKey:'PASTE_DEV_API_KEY', authDomain:'mpuwdc-dev.firebaseapp.com', projectId:'mpuwdc-dev', appId:'PASTE_DEV_APP_ID' },
    prod:{ apiKey:'PASTE_PROD_API_KEY', authDomain:'mpuwdc.firebaseapp.com', projectId:'mpuwdc', appId:'PASTE_PROD_APP_ID' }
  }
};
