'use strict';


const {dialogflow} = require('actions-on-google');
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Text, Card, Image, Suggestion, Payload} = require('dialogflow-fulfillment');
const admin = require('firebase-admin');
const app = dialogflow();


//Enables lib debugging statements
process.env.DEBUG = 'dialogflow:debug';

//Webapplikation initieren
//admin.initializeApp();


admin.initializeApp(functions.config().firebase);

//Zugriff auf Cloud-Firestore in Konstante speichern
const db = admin.firestore();

//"FieldValue" Objekt holen 
//https://firebase.google.com/docs/firestore/manage-data/delete-data#fields
const FieldValue = admin.firestore.FieldValue;

//Zugriff in Datenbank auf eine spezifische Kollektion
//const Nutzer = db.collection('Nutzer');

//Zugriff auf Einfache, Mittelschwere und Schwere Fragen in Konstanten gespeichert
const einfacheFragen = db.collection('Einfache Fragen');
const mittelschwereFragen = db.collection('Mittelschwere Fragen');
const schwereFragen = db.collection('Schwere Fragen');

//Zugriff in Datenbank auf Dokument Prüfungsrahmendaten
const Prüfungsrahmendaten = db.collection('Prüfung').doc('Prüfungsrahmendaten');
const Prüfungsfragen = db.collection('Prüfung').doc('Fragen');

//Array für einfache Fragen erstellen
var arrayFragenEinfach = [];

einfacheFragen.get().then((snapshot) => {
  	snapshot.docs.forEach(doc => {
      arrayFragenEinfach.push(doc.id);
    });
  Prüfungsfragen.update({
      	EinfacheFragen: arrayFragenEinfach});
});

//Array für Mittelschwere Fragen erstellen
var arrayFragenMittel = [];

mittelschwereFragen.get().then((snapshot) => {
  	snapshot.docs.forEach(doc => {
      arrayFragenMittel.push(doc.id);
    });
  Prüfungsfragen.update({
      	MittelschwereFragen: arrayFragenMittel});
});

//Array für einfache Fragen erstellen
var arrayFragenSchwer = [];

schwereFragen.get().then((snapshot) => {
  	snapshot.docs.forEach(doc => {
      arrayFragenSchwer.push(doc.id);
    });
  Prüfungsfragen.update({
      	SchwereFragen: arrayFragenSchwer});
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
const agent = new WebhookClient({ request, response });
console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

function welcome(agent) {

   const Prüfungsrahmendaten = db.collection('Prüfung').doc('Prüfungsrahmendaten');
  
  //Prüfungsrahmendaten in Variablen speichern
	return Prüfungsrahmendaten.get()
  	.then((snapshot) => {
      const {Start} = snapshot.data();
      const {Ende} = snapshot.data();
      
      //Start Datum von UTC auf GMT+2 umwandeln 
      //var StartGMT2 = Start.getTimezoneOffset();
      
      //Start Datum in Komponenten zerlegen damit das Datum leserlich angezeigt werden kann.
  var Minuten = Start.getMinutes();
  if (Minuten < 10){Minuten = '0'+ Minuten;}
  var Stunden = Start.getHours()+2;
  var Tag = Start.getDate();
  var MonatZahl = Start.getMonth();
  var Jahr = Start.getFullYear();
  var NameMonat = [
  "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"
];
  var Monat = NameMonat[MonatZahl];
      
    
  
  const DatumJetzt = new Date();


if (Date.parse(Start) > Date.parse(DatumJetzt)){
  agent.add(/*'Das Zeitfenster für die Prüfung wird erst noch freigeschaltet.'*/`Das Zeitfenster für die Prüfung wird erst am ${Tag}. ${Monat} ${Jahr} um ${Stunden}:${Minuten} Uhr freigeschaltet.`);
}else if(Date.parse(DatumJetzt) > Date.parse(Ende)){
  agent.add('Das Zeitfenster für die Prüfung ist abgelaufen.');
  //const sessionId = agent.session+'/contexts/zugangscode_einlesen';
  //agent.add(sessionId);
  //agent.context.delete(sessionId);
  //agent.context.set({
  //'name': sessionId,
  //'lifespan': 0,
  //'parameters': {
  //  'parameter':'parameter-value'
  //}
  //});
}else{
 
  agent.add('Bitte geben Sie ihren Zugangscode ein.');
}
});

    
}

//Zugangscode einlesen und überprüfen
function zugangscode(agent) {
  const sessionVars = agent.session+'/contexts/session-vars';
  //agent.add(`'${sessionVars}'`);
  //agent.context.delete( `${sessionVars}` );
  //agent.context.set({ 'name': `'${sessionVars}'`, 'lifespan': '0', 'parameters': {} });
  
  var Zugangscode = agent.parameters.Zugangscode;

  return db.collection('Nutzer').doc(`${Zugangscode}`).get()
    .then((snapshot) => {
      const {Vorname, Nachname} = snapshot.data();
      agent.add(`Wilkommen zur Prüfung ${Vorname} ${Nachname}. ` +
        `Haben Sie das Mikrofon bereits getestet? Ja | Nein`);
    }).catch((e) => {
      console.log('error:', e);
      agent.add('Entweder haben Sie ihren Zugangscode falsch eingegeben oder er ist nicht vorhanden. Bitte starten Sie die Prüfung erneut.');
    });
}


//Nutzer nach Schwierigkeitsgrad der ersten Frage nach Anmeldung fragen.  
function schwierigkeitsgrad(agent) {
  agent.add('Was für einen Schwierigkeitsgrad möchten Sie für die kommende Frage? Einfach | Mittel | Schwer');
  agent.add(new Suggestion(`Einfach`));
  agent.add(new Suggestion(`Mittel`));
  agent.add(new Suggestion(`Schwer`));

}
  
  
//Einfache Frage stellen
function eFragen(agent) {
  
  //Prüfungsrahmendaten in Variablen speichern
	return Prüfungsrahmendaten.get()
  	.then((snapshot) => {
      	const {Anzahl} = snapshot.data(); 
  	
  
  let Zugangscodefix = agent.parameters.Nutzer;


  var TimeNow = new Date();

  return db.collection('Nutzer').doc(`${Zugangscodefix}`).get().then((snapshot) => {
	
    const {Count} = snapshot.data();
    const {Timestamp} = snapshot.data();
    
    return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	.then(doc => { 
    
    //Überprüfen, ob die, für die Prüfung angegebene Anzahl Fragen erreicht wurde.
    if (Count >= Anzahl && doc.data().Antwort) {
      agent.add('Die Prüfung ist abgeschlossen. Vielen Dank für die Teilnahme');

    }else if(Date.parse(Timestamp) < Date.parse(TimeNow)){

    	agent.add('Die verfügbare Zeit ist abgelaufen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Anzahl bereitsgestellter Fragen mehr als eins ist.
    }else if(Count >= 1){
      
    //return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	//.then(doc => { 
      
        if (!doc.data().Antwort){
        	const {Frage} = doc.data();
        	agent.add(`${Frage}`);
        
        }else{

      	return db.collection('Nutzer').doc(`${Zugangscodefix}`).get()
  		.then((snapshot) => {
          
          	const {EinfacheFragen} = snapshot.data();
            const {Count} = snapshot.data();
          	
            
            function getZufälligeNummerEinfach(){
				return  Math.floor((Math.random()*(EinfacheFragen.length)));
	  		}

  	 	    var ZufälligeNummerEinfach = getZufälligeNummerEinfach();
      
            var ZufälligeFrageZahl = EinfacheFragen[ZufälligeNummerEinfach];
          
            EinfacheFragen.splice(ZufälligeNummerEinfach, 1);
          
            var CounterAktuell = Count + 1;
          
            return einfacheFragen.doc(`${ZufälligeFrageZahl}`).get()
 			 .then((snapshot) => {
            
              const {Frage} = snapshot.data();
              
              db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${CounterAktuell}`).set({
    	      Frage: Frage,
              level: 'Einfach'});

              agent.add(`${Frage}`);

            
          	db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
      		Count: CounterAktuell,
            EinfacheFragen: EinfacheFragen});


    	});
	});
    }
    //});
    //Hiermit ist es die erste Frage die gestellt wird. Ein Count muss beim Nutzer erstellt werden, mit welchem die Anzahl bereits gestellten Fragen überprüft werden kann.
    }else{

	return Prüfungsfragen.get()
    .then((snapshot) => {
      const {EinfacheFragen} = snapshot.data();
      const {MittelschwereFragen} = snapshot.data();
      const {SchwereFragen} = snapshot.data();
      
      function getZufälligeNummerEinfach(){
		return  Math.floor((Math.random()*(EinfacheFragen.length)));
	  }

  	  var ZufälligeNummerEinfach = getZufälligeNummerEinfach();
      
      var ZufälligeFrageZahl = EinfacheFragen[ZufälligeNummerEinfach];
    
      	//Prüfungsrahmendaten in Variablen speichern
		return Prüfungsrahmendaten.get()
  		.then((snapshot) => {
      		const {Zeit} = snapshot.data();
          
      	//ZufälligeFrageEinfach = getZufälligeFrageEinfach();

      	return einfacheFragen.doc(`${ZufälligeFrageZahl}`).get()
 		 .then((snapshot) => {
      		const {Frage} = snapshot.data();
          
            EinfacheFragen.splice(ZufälligeNummerEinfach, 1);
          
            db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc('1').set({
    	    Frage: Frage,
            level: 'Einfach'});

		    var dt = new Date();
            dt.setMinutes(dt.getMinutes() + Zeit);

      	    db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
         	Count: 1,
        	Timestamp: dt,
            EinfacheFragen: EinfacheFragen,
            MittelschwereFragen: MittelschwereFragen,
            SchwereFragen: SchwereFragen});
          
            agent.add(`${Frage}`);
       
        });
        });
    });

    }
  })
  .catch(err => {
    console.log('Es ist ein Fehler mit der Datenbank aufgetreten.', err);
  });
  });
});
}


//Mittelschwere Frage stellen
function mFragen(agent) {
  
  //Prüfungsrahmendaten in Variablen speichern
	return Prüfungsrahmendaten.get()
  	.then((snapshot) => {
      	const {Anzahl} = snapshot.data(); 
  	
  
  let Zugangscodefix = agent.parameters.Nutzer;


  var TimeNow = new Date();

  return db.collection('Nutzer').doc(`${Zugangscodefix}`).get().then((snapshot) => {
	
    const {Count} = snapshot.data();
    const {Timestamp} = snapshot.data();
    
    return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	.then(doc => { 
    
    //Überprüfen, ob die, für die Prüfung angegebene Anzahl Fragen erreicht wurde.
    if (Count >= Anzahl && doc.data().Antwort) {
      agent.add('Die Prüfung ist abgeschlossen. Vielen Dank für die Teilnahme');

    }else if(Date.parse(Timestamp) < Date.parse(TimeNow)){

    	agent.add('Die verfügbare Zeit ist abgelaufen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Anzahl bereitsgestellter Fragen mehr als eins ist.
    }else if(Count >= 1){
      
    //return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	//.then(doc => { 
      
        if (!doc.data().Antwort){
        	const {Frage} = doc.data();
        	agent.add(`${Frage}`);
        
        }else{

      	return db.collection('Nutzer').doc(`${Zugangscodefix}`).get()
  		.then((snapshot) => {
          
          	const {MittelschwereFragen} = snapshot.data();
            const {Count} = snapshot.data();
          	
            
            function getZufälligeNummerMittelschwer(){
				return  Math.floor((Math.random()*(MittelschwereFragen.length)));
	  		}

  	 	    var ZufälligeNummerMittelschwer = getZufälligeNummerMittelschwer();
      
            var ZufälligeFrageZahl = MittelschwereFragen[ZufälligeNummerMittelschwer];
          
            MittelschwereFragen.splice(ZufälligeNummerMittelschwer, 1);
          
            var CounterAktuell = Count + 1;
          
            return mittelschwereFragen.doc(`${ZufälligeFrageZahl}`).get()
 			 .then((snapshot) => {
            
              const {Frage} = snapshot.data();
              
              db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${CounterAktuell}`).set({
    	      Frage: Frage,
              level: 'Mittel'});

              agent.add(`${Frage}`);

            
          	db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
      		Count: CounterAktuell,
            MittelschwereFragen: MittelschwereFragen});


    	});
	});
    }
    //});
    //Hiermit ist es die erste Frage die gestellt wird. Ein Count muss beim Nutzer erstellt werden, mit welchem die Anzahl bereits gestellten Fragen überprüft werden kann.
    }else{

	return Prüfungsfragen.get()
    .then((snapshot) => {
      const {EinfacheFragen} = snapshot.data();
      const {MittelschwereFragen} = snapshot.data();
      const {SchwereFragen} = snapshot.data();
      
      function getZufälligeNummerMittelschwer(){
		return  Math.floor((Math.random()*(MittelschwereFragen.length)));
	  }

  	  var ZufälligeNummerMittelschwer = getZufälligeNummerMittelschwer();
      
      var ZufälligeFrageZahl = MittelschwereFragen[ZufälligeNummerMittelschwer];
    
      	//Prüfungsrahmendaten in Variablen speichern
		return Prüfungsrahmendaten.get()
  		.then((snapshot) => {
      		const {Zeit} = snapshot.data();
          
      	//ZufälligeFrageEinfach = getZufälligeFrageEinfach();

      	return mittelschwereFragen.doc(`${ZufälligeFrageZahl}`).get()
 		 .then((snapshot) => {
      		const {Frage} = snapshot.data();
          
            MittelschwereFragen.splice(ZufälligeNummerMittelschwer, 1);
          
            db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc('1').set({
    	    Frage: Frage,
            level: 'Mittel'});

		    var dt = new Date();
            dt.setMinutes(dt.getMinutes() + Zeit);

      	    db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
         	Count: 1,
        	Timestamp: dt,
            EinfacheFragen: EinfacheFragen,
            MittelschwereFragen: MittelschwereFragen,
            SchwereFragen: SchwereFragen});
          
            agent.add(`${Frage}`);
       
        });
        });
    });

    }
  })
  .catch(err => {
    console.log('Es ist ein Fehler mit der Datenbank aufgetreten.', err);
  });
  });
});
}
  
  
//Schwere Frage stellen
function sFragen(agent) {
  
  //Prüfungsrahmendaten in Variablen speichern
	return Prüfungsrahmendaten.get()
  	.then((snapshot) => {
      	const {Anzahl} = snapshot.data(); 
  	
  
  let Zugangscodefix = agent.parameters.Nutzer;


  var TimeNow = new Date();

  return db.collection('Nutzer').doc(`${Zugangscodefix}`).get().then((snapshot) => {
	
    const {Count} = snapshot.data();
    const {Timestamp} = snapshot.data();
    
    return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	.then(doc => { 
    
    //Überprüfen, ob die, für die Prüfung angegebene Anzahl Fragen erreicht wurde.
    if (Count >= Anzahl && doc.data().Antwort) {
      agent.add('Die Prüfung ist abgeschlossen. Vielen Dank für die Teilnahme');

    }else if(Date.parse(Timestamp) < Date.parse(TimeNow)){

    	agent.add('Die verfügbare Zeit ist abgelaufen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Anzahl bereitsgestellter Fragen mehr als eins ist.
    }else if(Count >= 1){
      
    //return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	//.then(doc => { 
      
        if (!doc.data().Antwort){
        	const {Frage} = doc.data();
        	agent.add(`${Frage}`);
        
        }else{

      	return db.collection('Nutzer').doc(`${Zugangscodefix}`).get()
  		.then((snapshot) => {
          
          	const {SchwereFragen} = snapshot.data();
            const {Count} = snapshot.data();
          	
            
            function getZufälligeNummerSchwer(){
				return  Math.floor((Math.random()*(SchwereFragen.length)));
	  		}

  	 	    var ZufälligeNummerSchwer = getZufälligeNummerSchwer();
      
            var ZufälligeFrageZahl = SchwereFragen[ZufälligeNummerSchwer];
          
            SchwereFragen.splice(ZufälligeNummerSchwer, 1);
          
            var CounterAktuell = Count + 1;
          
            return schwereFragen.doc(`${ZufälligeFrageZahl}`).get()
 			 .then((snapshot) => {
            
              const {Frage} = snapshot.data();
              
              db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${CounterAktuell}`).set({
    	      Frage: Frage,
              level: 'Schwer'});

              agent.add(`${Frage}`);

            
          	db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
      		Count: CounterAktuell,
            SchwereFragen: SchwereFragen});


    	});
	});
    }
    //});
    //Hiermit ist es die erste Frage die gestellt wird. Ein Count muss beim Nutzer erstellt werden, mit welchem die Anzahl bereits gestellten Fragen überprüft werden kann.
    }else{

	return Prüfungsfragen.get()
    .then((snapshot) => {
      const {EinfacheFragen} = snapshot.data();
      const {MittelschwereFragen} = snapshot.data();
      const {SchwereFragen} = snapshot.data();
      
      function getZufälligeNummerSchwer(){
		return  Math.floor((Math.random()*(SchwereFragen.length)));
	  }

  	  var ZufälligeNummerSchwer = getZufälligeNummerSchwer();
      
      var ZufälligeFrageZahl = SchwereFragen[ZufälligeNummerSchwer];
    
      	//Prüfungsrahmendaten in Variablen speichern
		return Prüfungsrahmendaten.get()
  		.then((snapshot) => {
      		const {Zeit} = snapshot.data();
          
      	//ZufälligeFrageEinfach = getZufälligeFrageEinfach();

      	return schwereFragen.doc(`${ZufälligeFrageZahl}`).get()
 		 .then((snapshot) => {
      		const {Frage} = snapshot.data();
          
            SchwereFragen.splice(ZufälligeNummerSchwer, 1);
          
            db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc('1').set({
    	    Frage: Frage,
            level: 'Schwer'});

		    var dt = new Date();
            dt.setMinutes(dt.getMinutes() + Zeit);

      	    db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
         	Count: 1,
        	Timestamp: dt,
            EinfacheFragen: EinfacheFragen,
            MittelschwereFragen: MittelschwereFragen,
            SchwereFragen: SchwereFragen});
          
            agent.add(`${Frage}`);
       
        });
        });
    });

    }
  })
  .catch(err => {
    console.log('Es ist ein Fehler mit der Datenbank aufgetreten.', err);
  });
  });
});
}
  
  
//Bestätigte Antwort speichern
function bestaetigungRichtig(agent) {
  
	let Zugangscodefix = agent.parameters.Nutzer;
  	let Antwortfix = agent.parameters.Antwort;

  	const NutzerDoc = db.collection('Nutzer').doc(`${Zugangscodefix}`);
	
	//Prüfungsrahmendaten in Variablen speichern
	return Prüfungsrahmendaten.get()
  	.then((snapshot) => {
      	const {Anzahl} = snapshot.data();
    
  
  	return NutzerDoc.get().then((snapshot) => {
      const {Count} = snapshot.data();
      const {Timestamp} = snapshot.data();
      
      NutzerDoc.collection('Antworten').doc(`${Count}`).update({
      Antwort: Antwortfix});

      var Datum1 = new Date();
	  var Datum2 = Timestamp;
      var ZeitDiff = Datum2.getTime() - Datum1.getTime();
	  var diffSek = Math.ceil(ZeitDiff / (1000));
      var diffMinKomma = diffSek / (60);
      var Minuten = Math.ceil((ZeitDiff / (1000*60))-1);
      var SekundenDez = (diffMinKomma - Minuten)*100;
      var Sekunden = (SekundenDez*0.6).toFixed(0);
      //if (Sekunden == 60){Sekunden = Sekunden - 1;}


      if (Count >= Anzahl){
        
        if (Anzahl == 1){

        	agent.add(`Ihre Antwort wurde gespeichert. Vielen Dank für Ihre Teilnahme.`);
            
          	//Arrays mit den noch nicht gestellten Fragen beim Nutzer löschen.
          	//https://firebase.google.com/docs/firestore/manage-data/delete-data#fields
            NutzerDoc.update({
            EinfacheFragen: FieldValue.delete(),
            MittelschwereFragen: FieldValue.delete(),
            SchwereFragen: FieldValue.delete()});
          
            
          
        }else{
          
            agent.add(`Ihre Antwort wurde gespeichert. Sie haben alle ${Anzahl} Fragen beantwortet. Vielen Dank für Ihre Teilnahme.`);
          	
          	//Arrays mit den noch nicht gestellten Fragen beim Nutzer löschen.
          	//https://firebase.google.com/docs/firestore/manage-data/delete-data#fields
            NutzerDoc.update({
            EinfacheFragen: FieldValue.delete(),
            MittelschwereFragen: FieldValue.delete(),
            SchwereFragen: FieldValue.delete()});
          
        }

      }else if (ZeitDiff <= 0){

        agent.add(`Ihre Antwort wurde gespeichert. Die Verfügbare Zeit ist leider Abgelaufen. Sie haben ${Count} von ${Anzahl} Fragen beantwortet.`);

      }else if (Minuten <= 0){
        
        agent.add(`Ihre Antwort wurde gespeichert. Sie haben ${Count} von ${Anzahl} Fragen beantwortet und noch ${Sekunden} Sekunden Zeit zur Verfügung. Was für einen Schwierigkeitsgrad möchten Sie für die nächste Frage? Einfach | Mittel | Schwer`);
        agent.add(new Suggestion(`Einfach`));
        agent.add(new Suggestion(`Mittel`));
        agent.add(new Suggestion(`Schwer`));
        
      }else{
		
        agent.add(`Ihre Antwort wurde gespeichert. Sie haben ${Count} von ${Anzahl} Fragen beantwortet und noch ${Minuten} Minuten und ${Sekunden} Sekunden Zeit zur Verfügung. Was für einen Schwierigkeitsgrad möchten Sie für die nächste Frage? Einfach | Mittel | Schwer`);
        agent.add(new Suggestion(`Einfach`));
        agent.add(new Suggestion(`Mittel`));
        agent.add(new Suggestion(`Schwer`));
        
      }
      });
	  });
}
  
  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Zugangscode einlesen', zugangscode);
  intentMap.set('Prüfungsbereit', schwierigkeitsgrad);
  intentMap.set('Einfache Fragen', eFragen);
  intentMap.set('Mittelschwere Fragen', mFragen);
  intentMap.set('Schwere Fragen', sFragen);
  intentMap.set('Bestätigung der Antwort richtig', bestaetigungRichtig);
  agent.handleRequest(intentMap);
});

