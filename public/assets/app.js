function goConfigured(key, fallback){const u=(window.MPU_CONFIG||{})[key]; if(u){location.href=u}else if(fallback){location.href=fallback}else alert('This module URL has not been connected yet.');}
function saveDemoPayment(row){const a=JSON.parse(localStorage.getItem('mpu_demo_payments')||'[]');a.unshift(row);localStorage.setItem('mpu_demo_payments',JSON.stringify(a));}
function getDemoPayments(){return JSON.parse(localStorage.getItem('mpu_demo_payments')||'[]');}
