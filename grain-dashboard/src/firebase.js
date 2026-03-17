import { initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: 'AIzaSyA6f0RLUMJ9Uy-UHFJO48WUZRlRZfIas4o',
  authDomain: 'grain-biz-dashboard.firebaseapp.com',
  projectId: 'grain-biz-dashboard',
  storageBucket: 'grain-biz-dashboard.firebasestorage.app',
  messagingSenderId: '587389680762',
  appId: '1:587389680762:web:1550cb8a7c21d672124fc3',
}

const app = initializeApp(firebaseConfig)

export default app

