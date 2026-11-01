// InvesTeen market engine (server side). Generates a random 3-year future one quarter at a time.
// Keep in sync with the browser copy in index.html.
export const START = 100000, QD = 65, NQ = 12;
var RAW=[
 ['index','SPY','S&P 500 Fund',763.25,'',.012,'Tracks the S&P 500: about 500 of the largest US companies across every industry.'],
 ['index','QQQ','Nasdaq-100 Fund',709.80,'Technology',.006,'Tracks the Nasdaq-100: 100 big companies, heavy on technology and growth.'],
 ['index','IWV','Total US Market Fund',440.97,'',.012,'Broad US market: large, mid-size and small companies together.'],
 ['sector','XLF','Financials Fund',55.52,'Financials',.015,'Banks, insurers and other financial companies.'],
 ['sector','XLE','Energy Fund',68.24,'Energy',.033,'Oil, gas and energy companies.'],
 ['sector','XLC','Communication Fund',110.32,'Communication',.009,'Media, telecom and internet companies.'],
 ['sector','XLI','Industrial Fund',167.76,'Industrials',.014,'Manufacturing, transport and industrial services.'],
 ['sector','XLK','Technology Fund',183.47,'Technology',.006,'Hardware, software and chip companies.'],
 ['sector','XLRE','Real Estate Fund',42.16,'Real estate',.033,'Companies that own buildings and real estate.'],
 ['sector','XLV','Health Care Fund',176.71,'Health care',.016,'Drug makers, biotech, hospitals and medical equipment.'],
 ['sector','XLP','Consumer Staples Fund',87.62,'Consumer staples',.026,'Everyday products like food, drinks and household goods.'],
 ['bond','BND','Total Bond Fund',70.82,'',.038,'A mix of thousands of US government and company bonds.'],
 ['bond','TLT','Long-Term Treasury Fund',80.05,'',.043,'Long-term US government bonds. Very sensitive to interest rates.'],
 ['bond','LQD','Corporate Bond Fund',103.50,'',.045,'Bonds from large, financially strong companies.'],
 ['stock','AAPL','Apple',343.46,'Technology',.004,'iPhone, Mac, AirPods and the App Store.'],
 ['stock','MSFT','Microsoft',529.05,'Technology',.007,'Windows, Office, Xbox and the Azure cloud.'],
 ['stock','AMZN','Amazon',250.00,'Consumer',0,'Online shopping, Prime Video and AWS cloud computing.'],
 ['stock','GOOG','Alphabet (Google)',336.91,'Communication',.003,'Google Search, YouTube, Android and Gemini AI.'],
 ['stock','NVDA','Nvidia',214.13,'Technology',.0002,'The chips that power AI, gaming and data centers.'],
 ['stock','TSLA','Tesla',354.72,'Cars',0,'Electric cars, batteries and robots.'],
 ['stock','F','Ford',12.43,'Cars',.048,'Cars, trucks and commercial vans.'],
 ['stock','GM','General Motors',83.96,'Cars',.007,'Chevrolet, GMC, Cadillac and Buick.'],
 ['stock','PFE','Pfizer',29.58,'Health care',.058,'Medicines and vaccines.'],
 ['stock','JNJ','Johnson & Johnson',255.56,'Health care',.021,'Medicines and medical devices.'],
 ['stock','DIS','Disney',110.59,'Communication',.009,'Movies, Disney+, ESPN and theme parks.'],
 ['stock','NKE','Nike',37.13,'Consumer',.04,'Sneakers, sportswear and gear.'],
 ['stock','UAA','Under Armour',4.74,'Consumer',0,'Athletic clothing and performance gear.'],
 ['stock','CMG','Chipotle',29.89,'Consumer',0,'Fast-casual Mexican-inspired restaurants.'],
 ['stock','SBUX','Starbucks',97.52,'Consumer',.025,'Coffee shops around the world.'],
 ['stock','HD','Home Depot',309.63,'Consumer',.029,'Home improvement stores: tools and building materials.'],
 ['stock','CVX','Chevron',224.99,'Energy',.03,'Oil and natural gas production.'],
 ['stock','KHC','Kraft Heinz',23.68,'Consumer staples',.06,'Packaged foods like ketchup, mac & cheese and snacks.']
];

var SECKEY={'Technology':'tech','Communication':'comm','Consumer':'cons','Cars':'auto','Energy':'energy','Health care':'health','Consumer staples':'staples','Financials':'fin','Industrials':'ind','Real estate':'re'};
var SIG={SPY:.17,QQQ:.22,IWV:.18,XLF:.20,XLE:.27,XLC:.22,XLI:.19,XLK:.25,XLRE:.21,XLV:.15,XLP:.13,BND:.06,TLT:.15,LQD:.09,AAPL:.29,MSFT:.27,AMZN:.32,GOOG:.29,NVDA:.48,TSLA:.58,F:.35,GM:.35,PFE:.25,JNJ:.17,DIS:.30,NKE:.34,UAA:.48,CMG:.32,SBUX:.30,HD:.24,CVX:.26,KHC:.22};
export const A = {}, LIST = [];
// Version 2 games (from November 2026) also include 32 more popular stocks. They move with their own
// random stream, so games started before keep exactly the same market.
var RAW2=[
 ['stock','META','Meta Platforms',614.99,'Communication',.003,'Facebook, Instagram, WhatsApp and Meta Quest VR headsets.',.38],
 ['stock','NFLX','Netflix',62.08,'Communication',0,'The world’s biggest video streaming service.',.38],
 ['stock','AMD','AMD',504.80,'Technology',0,'Computer and AI chips that compete with Intel and Nvidia.',.52],
 ['stock','INTC','Intel',65.76,'Technology',.011,'Processors for PCs and data centers, plus its own chip factories.',.48],
 ['stock','ADBE','Adobe',250.23,'Technology',0,'Photoshop, Premiere, Acrobat and other creative software.',.34],
 ['stock','CRM','Salesforce',229.17,'Technology',.008,'Cloud software that helps companies manage their customers.',.34],
 ['stock','ORCL','Oracle',130.67,'Technology',.014,'Databases and cloud computing for businesses.',.38],
 ['stock','AVGO','Broadcom',326.08,'Technology',.019,'Chips for networking, phones and AI data centers.',.42],
 ['stock','PLTR','Palantir',184.11,'Technology',0,'Data and AI software for governments and companies.',.62],
 ['stock','UBER','Uber',65.25,'Industrials',0,'Ride-hailing and Uber Eats food delivery.',.40],
 ['stock','ABNB','Airbnb',164.39,'Consumer',0,'Book homes and experiences from hosts around the world.',.40],
 ['stock','SPOT','Spotify',593.44,'Communication',0,'Music and podcast streaming.',.45],
 ['stock','PYPL','PayPal',57.01,'Financials',.011,'Online payments with PayPal and Venmo.',.38],
 ['stock','V','Visa',413.59,'Financials',.008,'The world’s biggest card payment network.',.20],
 ['stock','MA','Mastercard',638.01,'Financials',.0055,'A card payment network used in over 200 countries.',.21],
 ['stock','JPM','JPMorgan Chase',337.04,'Financials',.027,'The largest bank in the US.',.24],
 ['stock','BAC','Bank of America',50.01,'Financials',.032,'One of the biggest US banks.',.28],
 ['stock','GS','Goldman Sachs',894.55,'Financials',.018,'An investment bank that helps companies raise money and trade.',.28],
 ['stock','BRK.B','Berkshire Hathaway',542.49,'Financials',0,'Warren Buffett’s company: insurers, a railway and big stakes in other firms.',.17],
 ['stock','WMT','Walmart',123.51,'Consumer staples',.008,'The world’s biggest chain of stores.',.20],
 ['stock','COST','Costco',1012.28,'Consumer staples',.007,'Membership warehouse stores that sell in bulk.',.21],
 ['stock','TGT','Target',154.38,'Consumer',.034,'US department stores and online shopping.',.32],
 ['stock','MCD','McDonald’s',258.12,'Consumer',.024,'The world’s biggest burger restaurant chain.',.18],
 ['stock','KO','Coca-Cola',94.08,'Consumer staples',.031,'Coca-Cola, Sprite, Fanta and many other drinks.',.15],
 ['stock','PEP','PepsiCo',137.34,'Consumer staples',.030,'Pepsi, Gatorade, Lay’s and Doritos.',.17],
 ['stock','PG','Procter & Gamble',161.57,'Consumer staples',.025,'Tide, Pampers, Gillette and other household brands.',.16],
 ['stock','LLY','Eli Lilly',1417.54,'Health care',.0075,'Medicines for diabetes, weight loss and cancer.',.32],
 ['stock','UNH','UnitedHealth',406.97,'Health care',.014,'The biggest health insurance company in the US.',.30],
 ['stock','XOM','ExxonMobil',187.25,'Energy',.025,'The largest US oil and gas company.',.25],
 ['stock','BA','Boeing',171.55,'Industrials',.0025,'Passenger jets, defense and space.',.38],
 ['stock','RBLX','Roblox',42.99,'Communication',0,'The online platform where players build and play games.',.60],
 ['stock','LULU','Lululemon',107.24,'Consumer',0,'Yoga pants and athletic clothing.',.42]
];
export const A2 = {}, LIST2 = [];
RAW.forEach(function(r){var o={cls:r[0],sym:r[1],name:r[2],p0:r[3],sec:r[4],yld:r[5],about:r[6]};o.sk=SECKEY[o.sec]||'';o.sig=SIG[o.sym];
  if(o.cls==='index'){o.a=o.sym==='QQQ'?.88:.98;o.b=o.sym==='QQQ'?.4:0;}else if(o.cls==='sector'){o.a=.72;o.b=.55;}else if(o.cls==='bond'){o.a=.1;o.b=.85;}else{o.a=.55;o.b=.35;}
  o.c=Math.sqrt(Math.max(0,1-o.a*o.a-o.b*o.b));o.mu=o.cls==='bond'?.045:.085;A[o.sym]=o;LIST.push(o);});
RAW2.forEach(function(r){var o={cls:'stock',sym:r[1],name:r[2],p0:r[3],sec:r[4],yld:r[5],sig:r[7],about:r[6]};o.sk=SECKEY[o.sec]||'';o.a=.55;o.b=.35;
  o.c=Math.sqrt(Math.max(0,1-o.a*o.a-o.b*o.b));o.mu=.085;A2[o.sym]=o;LIST2.push(o);});
export const ALL = Object.assign({}, A, A2);
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rng = Math.random;
function gauss(){var u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function rnd(a,b){return a+rng()*(b-a);}
function pick(a){return a[Math.floor(rng()*a.length)];}
var DUR={BND:6,TLT:16,LQD:8},SEC_ETF={tech:'XLK',comm:'XLC',energy:'XLE',health:'XLV',staples:'XLP',fin:'XLF',ind:'XLI',re:'XLRE'};
var MKT_EV=[
  {t:'The Fed cuts interest rates by 0.25%',mkt:.012,r:-.0025,why:'Lower rates make borrowing cheaper, which usually helps stocks. Bond prices rise when rates fall.'},
  {t:'The Fed raises interest rates again',mkt:-.015,r:.0025,why:'Higher rates make loans more expensive and can slow the economy. Bond prices fall when rates rise.'},
  {t:'Inflation comes in hotter than expected',mkt:-.018,r:.0015,why:'Investors worry the Fed will keep rates high to fight rising prices.'},
  {t:'Inflation cools more than expected',mkt:.018,r:-.0015,why:'Slower price rises mean the Fed may be able to cut rates.'},
  {t:'A strong jobs report shows hiring is still solid',mkt:.008,r:.0006,why:'More people working usually means more spending and healthier companies.'},
  {t:'Recession fears grow as factory orders fall',mkt:-.03,r:-.002,why:'Stocks fall when people expect profits to shrink. Safe bonds often rise as investors look for shelter.'},
  {t:'Investors rush to safe bonds as stocks slide',mkt:-.025,r:-.0022,why:'When people get scared, they move money from stocks into bonds. That is why owning both helps.'},
  {t:'Stocks hit a new record high',mkt:.01,r:0,why:'Record highs happen often in a growing market. They don’t tell you what comes next.'},
  {t:'Consumer confidence jumps to a two-year high',mkt:.009,r:0,sec:{cons:.012},why:'Confident shoppers spend more, which helps companies that sell to them.'}
];
var SEC_EV=[
  {t:'Oil prices jump after supply problems in the Middle East',sec:{energy:.05},mkt:-.006,why:'Energy companies earn more when oil is expensive. Everyone else pays more for fuel.'},
  {t:'Oil prices slide as supply rises',sec:{energy:-.05},mkt:.004,why:'Cheaper oil hurts energy companies but helps airlines, shippers and drivers.'},
  {t:'Worries about AI spending hit tech stocks',sec:{tech:-.045,comm:-.015},why:'Tech companies spend billions on AI. Investors fear it might not pay off soon.'},
  {t:'A new AI breakthrough sparks a tech rally',sec:{tech:.045,comm:.015},why:'Investors bet the breakthrough will lead to new products and profits.'},
  {t:'Big banks report record profits',sec:{fin:.035},why:'Banks often earn more when interest rates are high.'},
  {t:'Regulators approve a wave of new medicines',sec:{health:.03},why:'New approved drugs mean new sales for health care companies.'},
  {t:'New drug price limits worry health care investors',sec:{health:-.035},why:'Lower drug prices can mean lower profits for drug makers.'},
  {t:'Holiday shopping beats expectations',sec:{cons:.03},why:'Strong sales help stores, brands and online shops.'},
  {t:'Shoppers cut back as prices stay high',sec:{cons:-.03,staples:.01},why:'People still buy groceries but skip extras like sneakers and eating out.'},
  {t:'Electric car sales slow down',sec:{auto:-.05},why:'Car makers have invested heavily in electric cars. Weak demand hurts their profits.'},
  {t:'Home sales fall to the lowest level in years',sec:{re:-.03},tick:{HD:-.03},why:'High mortgage rates keep buyers away, which hurts real estate and home improvement stores.'},
  {t:'New infrastructure projects boost factory orders',sec:{ind:.03},why:'Building roads, bridges and power lines means more work for industrial companies.'}
];
var CO_EV=[
  {t:'{n} beats its quarterly earnings forecast',x:[.04,.10],why:'Profits came in higher than investors expected, so the price jumped.'},
  {t:'{n} misses its quarterly earnings forecast',x:[-.10,-.04],why:'Profits came in lower than expected. Prices react to surprises.'},
  {t:'{n} raises its sales forecast for next year',x:[.03,.07],why:'A brighter outlook makes the company worth more to investors.'},
  {t:'{n} warns that sales will slow',x:[-.08,-.03],why:'Investors pay less for a company that expects to grow slower.'},
  {t:'{n} launches a hit new product',x:[.02,.05],why:'A popular product can mean more sales for years.'},
  {t:'Regulators open an investigation into {n}',x:[-.06,-.02],why:'Fines or new rules could cost the company money.'},
  {t:'{n} announces a big share buyback',x:[.02,.04],why:'Buying back its own shares leaves fewer shares, so each one owns more of the company.'}
];
function makeEvents2(){
  var n=3+Math.floor(rng()*4),evs=[],used={},stocks=LIST.filter(function(o){return o.cls==='stock';}).concat(LIST2);
  for(var i=0;i<n;i++){var r0=rng(),kind=i<2?'co':(r0<.3?'mkt':r0<.55?'sec':'co'),tpl,ev;
    for(var tries=0;tries<10;tries++){
      if(kind==='mkt'){tpl=pick(MKT_EV);ev={kind:'Market',t:tpl.t,why:tpl.why,mkt:tpl.mkt,r:tpl.r,sec:tpl.sec,tags:['SPY'].concat(tpl.r?['TLT']:[])};}
      else if(kind==='sec'){tpl=pick(SEC_EV2);var tg=[];Object.keys(tpl.sec).forEach(function(k){if(SEC_ETF[k])tg.push(SEC_ETF[k]);stocks.forEach(function(o){if(o.sk===k&&tg.length<4)tg.push(o.sym);});});if(tpl.tick)Object.keys(tpl.tick).forEach(function(k){if(tg.indexOf(k)<0)tg.push(k);});
        ev={kind:'Sector',t:tpl.t,why:tpl.why,mkt:tpl.mkt,r:tpl.r,sec:tpl.sec,tick:tpl.tick,tags:tg.slice(0,4)};}
      else{tpl=pick(CO_EV2);var o=pick(stocks),tk={};tk[o.sym]=rnd(tpl.x[0],tpl.x[1])*(o.sig/.3);ev={kind:'Company',t:tpl.t.replace('{n}',o.name),why:tpl.why,tick:tk,tags:[o.sym]};}
      if(!used[ev.t])break;}
    used[ev.t]=1;ev.m=rnd(.75,1.25);evs.push(ev);}
  var days=[];while(days.length<evs.length){var d=1+Math.floor(rng()*(QD-2));if(days.indexOf(d)<0)days.push(d);}
  days.sort(function(a,b){return a-b;});evs.forEach(function(e,i){e.dd=days[i];});return evs;}
function shockFor(o,ev,m){var s=0;
  if(ev.mkt)s+=ev.mkt*m*(o.cls==='bond'?.05:o.cls==='stock'?1.1:1);
  if(ev.r){var r=ev.r*m;if(o.cls==='bond')s-=(DUR[o.sym]||o.dur||6)*r;if(o.sym==='XLRE')s-=4*r;if(o.sk==='fin')s+=1.5*r;}
  if(ev.sec&&o.sk&&ev.sec[o.sk]!=null)s+=ev.sec[o.sk]*m*(o.cls==='stock'?1.1:o.cls==='index'?.55:1);
  if(ev.tick){for(var k in ev.tick){var x=ev.tick[k]*m;if(k===o.sym)s+=x;else if(o.cls==='sector'&&ALL[k]&&ALL[k].sk===o.sk)s+=x*.08;else if(o.cls==='index')s+=x*(o.sym==='QQQ'&&ALL[k]&&ALL[k].sk==='tech'?.06:.02);}}
  return s;}
var CO_EV2=CO_EV.concat([
  {t:'Analysts upgrade {n} to a “buy”',x:[.02,.05],why:'When respected analysts turn positive, more investors want the stock.'},
  {t:'Analysts downgrade {n} to a “sell”',x:[-.05,-.02],why:'A downgrade can make investors worry they are paying too much.'},
  {t:'{n} raises its dividend',x:[.01,.03],why:'A bigger dividend shows the company is confident about its profits.'},
  {t:'{n} names a new CEO',x:[-.03,.04],why:'A new boss can mean a new plan. Investors guess whether it will work.'},
  {t:'{n} announces a big takeover deal',x:[-.05,.03],why:'Buying another company can help it grow, but deals are expensive and risky.'},
  {t:'{n} wins a huge new contract',x:[.03,.07],why:'A big contract means steady sales for years.'},
  {t:'{n} recalls a product over safety worries',x:[-.07,-.02],why:'Recalls cost money and can hurt a brand’s reputation.'},
  {t:'{n} reports a data breach',x:[-.06,-.02],why:'Hacks can mean fines, lawsuits and lost customer trust.'},
  {t:'{n} cuts thousands of jobs to save money',x:[-.02,.04],why:'Cost cuts can raise profits, but may also signal that business is slowing.'},
  {t:'{n} expands into new countries',x:[.01,.04],why:'New markets mean more possible customers.'},
  {t:'A rival sues {n} over a patent',x:[-.04,-.01],why:'Lawsuits create uncertainty and can end in big payouts.'},
  {t:'{n} shares go viral on social media',x:[.03,.09],why:'Hype can push a price up fast, and it can fade just as fast.'}
]);
var SEC_EV2=SEC_EV.concat([
  {t:'A streaming price war heats up',sec:{comm:-.03},why:'When companies cut prices to win subscribers, profits shrink.'},
  {t:'Travel demand hits a record',sec:{cons:.025,ind:.02},why:'Busy airports and hotels mean more sales for travel companies.'},
  {t:'The chip shortage finally eases',sec:{tech:.03,auto:.03},why:'More chips means companies can build and sell more products.'},
  {t:'Banks hit by worries about bad loans',sec:{fin:-.04},why:'If borrowers can’t pay back loans, banks lose money.'},
  {t:'A big drug trial disappoints',sec:{health:-.025},why:'Years of research can fail at the last step, and investors react.'},
  {t:'Snack and drink makers raise prices',sec:{staples:.02},why:'Higher prices can lift profits for companies people buy from every week.'},
  {t:'New rules for big tech companies are proposed',sec:{tech:-.025,comm:-.03},why:'Stricter rules could limit how these companies make money.'}
]);
function makeEvents(v){
  if(v>=2)return makeEvents2();
  var n=2+Math.floor(rng()*3),evs=[],used={},stocks=LIST.filter(function(o){return o.cls==='stock';});
  for(var i=0;i<n;i++){var kind=i===0?'co':(rng()<.4?'mkt':rng()<.6?'sec':'co'),tpl,ev;
    for(var tries=0;tries<10;tries++){
      if(kind==='mkt'){tpl=pick(MKT_EV);ev={kind:'Market',t:tpl.t,why:tpl.why,mkt:tpl.mkt,r:tpl.r,sec:tpl.sec,tags:['SPY'].concat(tpl.r?['TLT']:[])};}
      else if(kind==='sec'){tpl=pick(SEC_EV);var tg=[];Object.keys(tpl.sec).forEach(function(k){if(SEC_ETF[k])tg.push(SEC_ETF[k]);else stocks.forEach(function(o){if(o.sk===k&&tg.length<3)tg.push(o.sym);});});if(tpl.tick)tg=tg.concat(Object.keys(tpl.tick));
        ev={kind:'Sector',t:tpl.t,why:tpl.why,mkt:tpl.mkt,r:tpl.r,sec:tpl.sec,tick:tpl.tick,tags:tg.slice(0,3)};}
      else{tpl=pick(CO_EV);var o=pick(stocks),tk={};tk[o.sym]=rnd(tpl.x[0],tpl.x[1])*(o.sig/.3);ev={kind:'Company',t:tpl.t.replace('{n}',o.name),why:tpl.why,tick:tk,tags:[o.sym]};}
      if(!used[ev.t])break;}
    used[ev.t]=1;ev.m=rnd(.75,1.25);evs.push(ev);}
  var days=[];while(days.length<evs.length){var d=1+Math.floor(rng()*(QD-2));if(days.indexOf(d)<0)days.push(d);}
  days.sort(function(a,b){return a-b;});evs.forEach(function(e,i){e.dd=days[i];});return evs;}

// Simulate one quarter starting from `last` prices. Returns daily price paths (QD days) and news events.
// Extra investments (any US stock or fund a player adds). Their own random noise comes from a separate
// stream per symbol, so adding them never changes the 32 starter investments or the news.
function hashStr(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function gx(r){var u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
export function extraAsset(m){
  var cls=m.cls==='bond'?'bond':m.cls==='fund'?'fund':'stock',o={cls:cls,sym:m.sym,name:m.name,sec:m.sec||'',sk:m.sk||'',yld:Math.min(.12,Math.max(0,+m.yld||0))};
  o.sig=Math.min(cls==='stock'?.8:.6,Math.max(cls==='bond'?.03:.1,+m.sig||(cls==='bond'?.07:cls==='fund'?.2:.35)));
  if(cls==='bond'){o.a=.1;o.b=.85;o.dur=/long|20\+|25\+/i.test(o.name)?15:/short|0-|1-3|t-bill/i.test(o.name)?2:6;o.sig=o.dur>10?.14:o.dur<3?.03:.06;}
  else if(cls==='fund'){o.a=.85;o.b=o.sk?.3:0;}else{o.a=.55;o.b=o.sk?.35:0;}
  o.c=Math.sqrt(Math.max(0,1-o.a*o.a-o.b*o.b));o.mu=cls==='bond'?.045:.085;return o;}
var BASE={};RAW.concat(RAW2).forEach(function(r){BASE[r[1]]=r[3];});
// Price path of an extra investment from the start of the game up to the start of quarter q.
export function extraHistory(seed, q, o, p0, v){
  var path=[p0],last=Object.assign({},BASE),ex={};ex[o.sym]=o;last[o.sym]=p0;
  for(var k=0;k<q;k++){var r=simQuarter(seed,k,last,ex,v);path=path.concat(r.paths[o.sym]);last[o.sym]=r.last[o.sym];}
  return path;}
export function simQuarter(seed, q, last, ex, v){
  rng = mulberry32((seed ^ Math.imul(q + 1, 0x9E3779B1)) >>> 0);
  var evs = makeEvents(v), SK = Object.keys(SECKEY).map(function(k){return SECKEY[k];}), cur = {}, paths = {};
  LIST.forEach(function(o){cur[o.sym] = last[o.sym]; paths[o.sym] = [];});
  var exm = Object.assign({}, v >= 2 ? A2 : {}, ex || {}), XL = Object.keys(exm).sort().map(function(k){return exm[k];}), xr = {};
  XL.forEach(function(o){cur[o.sym] = last[o.sym]; paths[o.sym] = []; xr[o.sym] = mulberry32((hashStr(o.sym) ^ seed ^ Math.imul(q + 7, 0x85EBCA6B)) >>> 0);});
  for (var i = 1; i <= QD; i++){
    var zm = gauss(), zr = gauss(), zs = {}; SK.forEach(function(k){zs[k] = gauss();});
    var td = evs.filter(function(e){return e.dd === i;});
    LIST.forEach(function(o){
      var f = o.cls === 'bond' ? -zr : (o.sk ? zs[o.sk] : 0), z = o.a*zm + o.b*f + o.c*gauss();
      var p = cur[o.sym]*Math.exp((o.mu - o.yld - o.sig*o.sig/2)/252 + o.sig/Math.sqrt(252)*z);
      td.forEach(function(e){p *= 1 + shockFor(o, e, e.m);});
      p = Math.max(.5, Math.round(p*100)/100); cur[o.sym] = p; paths[o.sym].push(p);
    });
    XL.forEach(function(o){
      var f = o.cls === 'bond' ? -zr : (o.sk ? zs[o.sk] : 0), z = o.a*zm + o.b*f + o.c*gx(xr[o.sym]);
      var p = cur[o.sym]*Math.exp((o.mu - o.yld - o.sig*o.sig/2)/252 + o.sig/Math.sqrt(252)*z);
      td.forEach(function(e){p *= 1 + shockFor(o, e, e.m);});
      p = Math.max(.5, Math.round(p*100)/100); cur[o.sym] = p; paths[o.sym].push(p);
    });
  }
  rng = Math.random;
  return {paths: paths, last: cur, news: evs.map(function(e){return {dd: e.dd, kind: e.kind, t: e.t, why: e.why, tags: e.tags};})};
}
// Apply a list of trades at the given prices. Mirrors the browser's rounding exactly.
export function applyTrades(state, trades, prices){
  var ex = state.ex || {};
  if (!Array.isArray(trades) || trades.length > 500) throw new Error('Too many trades');
  trades.forEach(function(t){
    var s = t && t.s, n = t && t.n, p = prices[s];
    if (!(A[s] || A2[s] || ex[s]) || !(p > 0) || !Number.isInteger(n) || n <= 0 || n > 1e8 || (t.side !== 'buy' && t.side !== 'sell')) throw new Error('Invalid trade');
    var have = state.hold[s] || 0;
    if (t.side === 'buy'){ if (n*p > state.cash + 1e-9) throw new Error('Not enough cash for ' + s); state.hold[s] = have + n; state.cash = Math.round((state.cash - n*p)*100)/100; }
    else { if (n > have) throw new Error('Not enough shares of ' + s); state.hold[s] = have - n; if (!state.hold[s]) delete state.hold[s]; state.cash = Math.round((state.cash + n*p)*100)/100; }
  });
}
export function dividends(hold, prices, ex){var d=0;Object.keys(hold).sort().forEach(function(k){var y=ALL[k]?ALL[k].yld:ex&&ex[k]?extraAsset(ex[k]).yld:0;d+=hold[k]*prices[k]*y/4;});return Math.round(d*100)/100;}
export function worthOf(state, prices){var w=state.cash;Object.keys(state.hold).forEach(function(k){w+=state.hold[k]*prices[k];});return Math.round(w*100)/100;}
