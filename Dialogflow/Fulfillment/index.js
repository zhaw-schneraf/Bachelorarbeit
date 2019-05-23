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
admin.initializeApp(functions.config().firebase);

//Zugriff auf Cloud-Firestore in Konstante speichern
const db = admin.firestore();

//"FieldValue" Objekt holen 
//https://firebase.google.com/docs/firestore/manage-data/delete-data#fields
const FieldValue = admin.firestore.FieldValue;


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


//Intents abfangen und den entsprechenden Code ausführen
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
const agent = new WebhookClient({ request, response });
console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
console.log('Dialogflow Request body: ' + JSON.stringify(request.body));


//Überprüfen, ob die Prüfung freigeschaltet bisch
function welcome(agent) {
 
   //Zugriff auf Prüfungsrahmendaten in Datenbank
   const Prüfungsrahmendaten = db.collection('Prüfung').doc('Prüfungsrahmendaten');
  
 	//Prüfungsrahmendaten in Variablen speichern
	return Prüfungsrahmendaten.get()
  	.then((snapshot) => {
      const {Start} = snapshot.data();
      const {Ende} = snapshot.data();
      
     
      
      //Start Datum in Komponenten zerlegen damit das Datum leserlich angezeigt werden kann.
      //https://www.htmlgoodies.com/html5/javascript/calculating-the-difference-between-two-dates-in-javascript.html
  	  var Minuten = Start.getMinutes();
  	  if (Minuten < 10){Minuten = '0'+ Minuten;}
  	  var Stunden = Start.getHours();
  	  var Tag = Start.getDate();
  	  var MonatZahl = Start.getMonth();
  	  var Jahr = Start.getFullYear();
      var NameMonat = [
  "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"
      ];
  	  var Monat = NameMonat[MonatZahl];
      
      //Momentaner Zeitpunkt in Konstante speichern 
      const DatumJetzt = new Date();

//Überprüfen, ob die Prüfung schon freigeschaltet ist      
//https://stackoverflow.com/questions/20322507/how-to-check-if-one-datetime-is-later-than-another-in-javascript?answertab=active#tab-top
if (Date.parse(Start) > Date.parse(DatumJetzt)){
  
  agent.add('Das Zeitfenster für die Prüfung wird erst noch freigeschaltet.');
  
  //Genaue Zeit angabe in welcher die Prüfung freigegeben wird in UTC
  //agent.add(`Das Zeitfenster für die Prüfung wird erst am ${Tag}. ${Monat} ${Jahr} um ${Stunden}:${Minuten} Uhr (UTC) freigeschaltet.`);
  
  
//Überprüfen, ob das Zeitfenster für die Prüfung abgelaufen ist  
}else if(Date.parse(DatumJetzt) > Date.parse(Ende)){
  
  agent.add('Das Zeitfenster für die Prüfung ist abgelaufen.');

//Das Zeitfenster für die Prüfung ist offen. Den Nutzer um den Zugangscode bitten.
}else{
 
  agent.add('Bitte geben Sie ihren Zugangscode ein.');
}
});   
}

  
//Zugangscode einlesen und überprüfen
function zugangscode(agent) {
  
  //Zugangscode aus dem Parameter holen und in Variable speichern
  var Zugangscode = agent.parameters.Zugangscode;

  //Überprüfen, ob Zugangscode vorhanden ist und Vorname und Nachname aus der Datenbank lesen
  return db.collection('Nutzer').doc(`${Zugangscode}`).get()
    .then((snapshot) => {
      const {Vorname, Nachname} = snapshot.data();
      agent.add(`Wilkommen zur Prüfung ${Vorname} ${Nachname}. ` +
        `Haben Sie das Mikrofon bereits getestet? Ja | Nein`);
    }).catch((e) => {
      console.log('error:', e);
    	
      //Falls der eingegebene Zugangscode nicht in der Datenbank gefunden wird, diesen Text ausgeben
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
  	
  //Zugangscode aus dem Parameter holen und in Variable speichern
  let Zugangscodefix = agent.parameters.Nutzer;

  //Momentane Zeit in Variable speichern
  var TimeNow = new Date();
      
  //Den Count und den Timestamp aus der Datenbank holen
  return db.collection('Nutzer').doc(`${Zugangscodefix}`).get().then((snapshot) => {
	
    const {Count} = snapshot.data();
    const {Timestamp} = snapshot.data();
    
    //Überprüfen, ob es eine Frage bereits gestellt wurde. Falls ja, ob diese eine dazugehörende Antowrt gespeichert hat
    return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	.then(doc => { 
    
    //Überprüfen, ob die, für die Prüfung angegebene Anzahl Fragen erreicht wurde und die letzte Frage über eine gespeicherte Antwort beim Nutzer verfügt
    if (Count >= Anzahl && doc.data().Antwort) {
     
      agent.add('Die Prüfung ist abgeschlossen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Verfügbare Zeit abgelaufen ist  
    }else if(Date.parse(Timestamp) < Date.parse(TimeNow)){

    	agent.add('Die verfügbare Zeit ist abgelaufen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Anzahl bereits gestellter Fragen mehr als eins ist.
    }else if(Count >= 1){
        
      	//Falls die letzte Frage kein dazu gehörende Antwort hat, diese Frage stellen
        if (!doc.data().Antwort){
        	const {Frage} = doc.data();
        	
          	//Frage stellen
          	agent.add(`${Frage}`);
        
        //Nächste Frage stellen
        }else{

        //EinfacheFragen-Array und Count in Konstante speichern
      	return db.collection('Nutzer').doc(`${Zugangscodefix}`).get()
  		.then((snapshot) => {
          
          	const {EinfacheFragen} = snapshot.data();
            const {Count} = snapshot.data();
          	
            //Züfällige Nummer holen
            function getZufälligeNummerEinfach(){
				return  Math.floor((Math.random()*(EinfacheFragen.length)));
	  		}
			
          	//Züfällige Nummer in Variable speichern
  	 	    var ZufälligeNummerEinfach = getZufälligeNummerEinfach();
      		
          	//Mit der Zufälligen Nummer die Doc.id aus der Frage in Variable speichern
            var ZufälligeFrageZahl = EinfacheFragen[ZufälligeNummerEinfach];
          
          	//Die Doc.id aus dem Array löschen, sodass diese Frage nicht mehr gestellt werden kann 
            EinfacheFragen.splice(ZufälligeNummerEinfach, 1);
          	
          	//Count um eins erhöhen
            var CounterAktuell = Count + 1;
          	 
          	//Frage aus der Datenbank holen und in Konstante speichern
            return einfacheFragen.doc(`${ZufälligeFrageZahl}`).get()
 			 .then((snapshot) => {
            	
              const {Frage} = snapshot.data();
              
              //Frage und Schwierigkeitslevel beim Nutzer in Datenbank speichern
              db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${CounterAktuell}`).set({
    	      Frage: Frage,
              level: 'Einfach'});
				
              //Frage stellen
              agent.add(`${Frage}`);

              //Der aktuelle Count und der aktuelle Array in Datenbank beim Nutzer speichern
          	  db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
      		  Count: CounterAktuell,
              EinfacheFragen: EinfacheFragen});


    	});
	});
    }
    //Hiermit ist es die erste Frage die gestellt wird. Ein Count muss beim Nutzer erstellt werden, mit welchem die Anzahl bereits gestellten Fragen überprüft werden kann.
    }else{
	
    //Alle Arrays aus der Datenbank in Konstanten speichern
	return Prüfungsfragen.get()
    .then((snapshot) => {
      const {EinfacheFragen} = snapshot.data();
      const {MittelschwereFragen} = snapshot.data();
      const {SchwereFragen} = snapshot.data();
      
      //Züfällige Nummer holen
      function getZufälligeNummerEinfach(){
		return  Math.floor((Math.random()*(EinfacheFragen.length)));
	  }

      //Züfällige Nummer in Variable speichern
  	  var ZufälligeNummerEinfach = getZufälligeNummerEinfach();
      
      //Mit der Zufälligen Nummer die Doc.id aus der Frage in Variable speichern
      var ZufälligeFrageZahl = EinfacheFragen[ZufälligeNummerEinfach];
    
      	//Aus den Prüfungsrahmendaten die Zeit in eine Variablen speichern
		return Prüfungsrahmendaten.get()
  		.then((snapshot) => {
      		const {Zeit} = snapshot.data();
          
		//Frage aus der Datenbank holen und in Konstante speichern
      	return einfacheFragen.doc(`${ZufälligeFrageZahl}`).get()
 		 .then((snapshot) => {
      		const {Frage} = snapshot.data();
          	
          	//Die Doc.id aus dem Array löschen, sodass diese Frage nicht mehr gestellt werden kann
            EinfacheFragen.splice(ZufälligeNummerEinfach, 1);
          
          	//Frage und Schwierigkeitslevel beim Nutzer in Datenbank speichern
            db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc('1').set({
    	    Frage: Frage,
            level: 'Einfach'});
          
			//Aktuelle Zeit in Variable speichern
		    var dt = new Date();
          
          	//Der aktuellen Zeit die verfügbare Zeit in Minuten hinzuzählen
            //https://www.tutorialspoint.com/How-to-add-30-minutes-to-a-JavaScript-Date-object
          	dt.setMinutes(dt.getMinutes() + Zeit);
			
          	//Count mit 1, Timestamp, und alle drei Array beim Nutzer in der Datenbank speichern
      	    db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
         	Count: 1,
        	Timestamp: dt,
            EinfacheFragen: EinfacheFragen,
            MittelschwereFragen: MittelschwereFragen,
            SchwereFragen: SchwereFragen});
          	
          	//Frage stellen
            agent.add(`${Frage}`);
       
        });
        });
    });

    }
  })
  .catch(err => {
    
    //Falls ein Fehler auftreten sollte diese Meldung im Log geben 
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
  	
  //Zugangscode aus dem Parameter holen und in Variable speichern
  let Zugangscodefix = agent.parameters.Nutzer;

  //Momentane Zeit in Variable speichern
  var TimeNow = new Date();

  //Den Count und den Timestamp aus der Datenbank holen
  return db.collection('Nutzer').doc(`${Zugangscodefix}`).get().then((snapshot) => {
	
    const {Count} = snapshot.data();
    const {Timestamp} = snapshot.data();
    
    //Überprüfen, ob es eine Frage bereits gestellt wurde. Falls ja, ob diese eine dazugehörende Antowrt gespeichert hat
    return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	.then(doc => { 
    
    //Überprüfen, ob die, für die Prüfung angegebene Anzahl Fragen erreicht wurde und die letzte Frage über eine gespeicherte Antwort beim Nutzer verfügt
    if (Count >= Anzahl && doc.data().Antwort) {
      
      agent.add('Die Prüfung ist abgeschlossen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Verfügbare Zeit abgelaufen ist 
    }else if(Date.parse(Timestamp) < Date.parse(TimeNow)){

    	agent.add('Die verfügbare Zeit ist abgelaufen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Anzahl bereitsgestellter Fragen mehr als eins ist.
    }else if(Count >= 1){

      	//Falls die letzte Frage kein dazu gehörende Antwort hat, diese Frage stellen
        if (!doc.data().Antwort){
        	const {Frage} = doc.data();
        	
          	//Frage stellen
          	agent.add(`${Frage}`);
        
        //Nächste Frage stellen  
        }else{
          
		//EinfacheFragen-Array und Count in Konstante speichern
      	return db.collection('Nutzer').doc(`${Zugangscodefix}`).get()
  		.then((snapshot) => {
          
          	const {MittelschwereFragen} = snapshot.data();
            const {Count} = snapshot.data();
          	
            //Züfällige Nummer holen
            function getZufälligeNummerMittelschwer(){
				return  Math.floor((Math.random()*(MittelschwereFragen.length)));
	  		}

          	//Züfällige Nummer in Variable speichern
  	 	    var ZufälligeNummerMittelschwer = getZufälligeNummerMittelschwer();
      
          	//Mit der Zufälligen Nummer die Doc.id aus der Frage in Variable speichern
            var ZufälligeFrageZahl = MittelschwereFragen[ZufälligeNummerMittelschwer];
          
          	//Die Doc.id aus dem Array löschen, sodass diese Frage nicht mehr gestellt werden kann
            MittelschwereFragen.splice(ZufälligeNummerMittelschwer, 1);
          	
          	//Count um eins erhöhen
            var CounterAktuell = Count + 1;
          
            //Frage aus der Datenbank holen und in Konstante speichern
          	return mittelschwereFragen.doc(`${ZufälligeFrageZahl}`).get()
 			 .then((snapshot) => {
            
              const {Frage} = snapshot.data();
              
              //Frage und Schwierigkeitslevel beim Nutzer in Datenbank speichern
              db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${CounterAktuell}`).set({
    	      Frage: Frage,
              level: 'Mittel'});
				
              //Frage stellen
              agent.add(`${Frage}`);

              //Der aktuelle Count und der aktuelle Array in Datenbank beim Nutzer speichern
          	  db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
      		  Count: CounterAktuell,
              MittelschwereFragen: MittelschwereFragen});


    	});
	});
    }
    //Hiermit ist es die erste Frage die gestellt wird. Ein Count muss beim Nutzer erstellt werden, mit welchem die Anzahl bereits gestellten Fragen überprüft werden kann.
    }else{

    //Alle Arrays aus der Datenbank in Konstanten speichern
	return Prüfungsfragen.get()
    .then((snapshot) => {
      const {EinfacheFragen} = snapshot.data();
      const {MittelschwereFragen} = snapshot.data();
      const {SchwereFragen} = snapshot.data();
      
      //Züfällige Nummer holen
      function getZufälligeNummerMittelschwer(){
		return  Math.floor((Math.random()*(MittelschwereFragen.length)));
	  }

      //Züfällige Nummer in Variable speichern
  	  var ZufälligeNummerMittelschwer = getZufälligeNummerMittelschwer();
      
      //Mit der Zufälligen Nummer die Doc.id aus der Frage in Variable speichern
      var ZufälligeFrageZahl = MittelschwereFragen[ZufälligeNummerMittelschwer];
    
      	//Aus den Prüfungsrahmendaten die Zeit in eine Variablen speichern
		return Prüfungsrahmendaten.get()
  		.then((snapshot) => {
      		const {Zeit} = snapshot.data();
          
		//Frage aus der Datenbank holen und in Konstante speichern
      	return mittelschwereFragen.doc(`${ZufälligeFrageZahl}`).get()
 		 .then((snapshot) => {
      		const {Frage} = snapshot.data();
          	
          	//Die Doc.id aus dem Array löschen, sodass diese Frage nicht mehr gestellt werden kann
            MittelschwereFragen.splice(ZufälligeNummerMittelschwer, 1);
          
            //Frage und Schwierigkeitslevel beim Nutzer in Datenbank speichern
          	db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc('1').set({
    	    Frage: Frage,
            level: 'Mittel'});
			
          	//Aktuelle Zeit in Variable speichern
		    var dt = new Date();
          
          	//Der aktuellen Zeit die verfügbare Zeit in Minuten hinzuzählen
          	//https://www.tutorialspoint.com/How-to-add-30-minutes-to-a-JavaScript-Date-object
            dt.setMinutes(dt.getMinutes() + Zeit);

      	    //Count mit 1, Timestamp, und alle drei Array beim Nutzer in der Datenbank speichern
          	db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
         	Count: 1,
        	Timestamp: dt,
            EinfacheFragen: EinfacheFragen,
            MittelschwereFragen: MittelschwereFragen,
            SchwereFragen: SchwereFragen});
          
            //Frage stellen
          	agent.add(`${Frage}`);
       
        });
        });
    });

    }
  })
  .catch(err => {
      
      //Falls ein Fehler auftreten sollte diese Meldung im Log eintragen
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
  	
  //Zugangscode aus dem Parameter holen und in Variable speichern
  let Zugangscodefix = agent.parameters.Nutzer;

  //Momentane Zeit in Variable speichern
  var TimeNow = new Date();

  //Den Count und den Timestamp aus der Datenbank holen
  return db.collection('Nutzer').doc(`${Zugangscodefix}`).get().then((snapshot) => {
	
    const {Count} = snapshot.data();
    const {Timestamp} = snapshot.data();
    
    //Überprüfen, ob es eine Frage bereits gestellt wurde. Falls ja, ob diese eine dazugehörende Antowrt gespeichert hat
    return db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${Count}`).get()
  	.then(doc => { 
    
    //Überprüfen, ob die, für die Prüfung angegebene Anzahl Fragen erreicht wurde und die letzte Frage über eine gespeicherte Antwort beim Nutzer verfügt
    if (Count >= Anzahl && doc.data().Antwort) {
      
      agent.add('Die Prüfung ist abgeschlossen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Verfügbare Zeit abgelaufen ist 
    }else if(Date.parse(Timestamp) < Date.parse(TimeNow)){

    	agent.add('Die verfügbare Zeit ist abgelaufen. Vielen Dank für die Teilnahme');

    //Überprüfen, ob die Anzahl bereitsgestellter Fragen mehr als eins ist.
    }else if(Count >= 1){
      
      	//Falls die letzte Frage kein dazu gehörende Antwort hat, diese Frage stellen
        if (!doc.data().Antwort){
        	const {Frage} = doc.data();
        	
          	//Frage stellen
          	agent.add(`${Frage}`);
        
        //Nächste Frage stellen
        }else{

        //EinfacheFragen-Array und Count in Konstante speichern
      	return db.collection('Nutzer').doc(`${Zugangscodefix}`).get()
  		.then((snapshot) => {
          
          	const {SchwereFragen} = snapshot.data();
            const {Count} = snapshot.data();
          	
            //Züfällige Nummer holen
            function getZufälligeNummerSchwer(){
				return  Math.floor((Math.random()*(SchwereFragen.length)));
	  		}
	
          	//Züfällige Nummer in Variable speichern
  	 	    var ZufälligeNummerSchwer = getZufälligeNummerSchwer();
      
          	//Mit der Zufälligen Nummer die Doc.id aus der Frage in Variable speichern
            var ZufälligeFrageZahl = SchwereFragen[ZufälligeNummerSchwer];
          
          	//Die Doc.id aus dem Array löschen, sodass diese Frage nicht mehr gestellt werden kann
            SchwereFragen.splice(ZufälligeNummerSchwer, 1);
          
          	//Count um eins erhöhen
            var CounterAktuell = Count + 1;
          	
          	//Frage aus der Datenbank holen und in Konstante speichern
            return schwereFragen.doc(`${ZufälligeFrageZahl}`).get()
 			 .then((snapshot) => {
            
              const {Frage} = snapshot.data();
              
              //Frage und Schwierigkeitslevel beim Nutzer in Datenbank speichern
              db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc(`${CounterAktuell}`).set({
    	      Frage: Frage,
              level: 'Schwer'});
			
              //Frage stellen
              agent.add(`${Frage}`);

              //Der aktuelle Count und der aktuelle Array in Datenbank beim Nutzer speichern
          	  db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
      		  Count: CounterAktuell,
              SchwereFragen: SchwereFragen});


    	});
	});
    }
    //Hiermit ist es die erste Frage die gestellt wird. Ein Count muss beim Nutzer erstellt werden, mit welchem die Anzahl bereits gestellten Fragen überprüft werden kann.
    }else{

    //Alle Arrays aus der Datenbank in Konstanten speichern
	return Prüfungsfragen.get()
    .then((snapshot) => {
      const {EinfacheFragen} = snapshot.data();
      const {MittelschwereFragen} = snapshot.data();
      const {SchwereFragen} = snapshot.data();
      
      //Züfällige Nummer holen
      function getZufälligeNummerSchwer(){
		return  Math.floor((Math.random()*(SchwereFragen.length)));
	  }

      //Züfällige Nummer in Variable speichern
  	  var ZufälligeNummerSchwer = getZufälligeNummerSchwer();
      
      //Mit der Zufälligen Nummer die Doc.id aus der Frage in Variable speichern
      var ZufälligeFrageZahl = SchwereFragen[ZufälligeNummerSchwer];
    
      	//Aus den Prüfungsrahmendaten die Zeit in eine Variablen speichern
		return Prüfungsrahmendaten.get()
  		.then((snapshot) => {
      		const {Zeit} = snapshot.data();
          
		//Frage aus der Datenbank holen und in Konstante speichern
      	return schwereFragen.doc(`${ZufälligeFrageZahl}`).get()
 		 .then((snapshot) => {
      		const {Frage} = snapshot.data();
          
          	//Die Doc.id aus dem Array löschen, sodass diese Frage nicht mehr gestellt werden kann
            SchwereFragen.splice(ZufälligeNummerSchwer, 1);
          
          	//Frage und Schwierigkeitslevel beim Nutzer in Datenbank speichern
            db.collection('Nutzer').doc(`${Zugangscodefix}`).collection('Antworten').doc('1').set({
    	    Frage: Frage,
            level: 'Schwer'});
			
          	//Aktuelle Zeit in Variable speichern
		    var dt = new Date();
          
          	//Der aktuellen Zeit die verfügbare Zeit in Minuten hinzuzählen
          	//https://www.tutorialspoint.com/How-to-add-30-minutes-to-a-JavaScript-Date-object
            dt.setMinutes(dt.getMinutes() + Zeit);
	
          	//Count mit 1, Timestamp, und alle drei Array beim Nutzer in der Datenbank speichern
      	    db.collection('Nutzer').doc(`${Zugangscodefix}`).update({
         	Count: 1,
        	Timestamp: dt,
            EinfacheFragen: EinfacheFragen,
            MittelschwereFragen: MittelschwereFragen,
            SchwereFragen: SchwereFragen});
          	
          	//Frage stellen
            agent.add(`${Frage}`);
       
        });
        });
    });

    }
  })
  .catch(err => {
      
    //Falls ein Fehler auftreten sollte diese Meldung im Log eintragen  
    console.log('Es ist ein Fehler mit der Datenbank aufgetreten.', err);
  
    });
  });
});
}
  
  
//Bestätigte Antwort speichern
function bestaetigungRichtig(agent) {
  	
  	//Zugangscode aus dem Parameter holen und in Variable speichern
	let Zugangscodefix = agent.parameters.Nutzer;
  	
  	//Antwort aus dem Parameter holen und in Variable speichern
  	let Antwortfix = agent.parameters.Antwort;

  	//Zugriff auf Dokument vom Nutzer in der Datenbank in Konstante speichern	
  	const NutzerDoc = db.collection('Nutzer').doc(`${Zugangscodefix}`);
	
	//Die Anzahl aus den Prüfungsrahmendaten in eine Konstante speichern
	return Prüfungsrahmendaten.get()
  	.then((snapshot) => {
      	const {Anzahl} = snapshot.data();
    
  	//Count und Timestamp vom Nutzer in Konstanten speichern
  	return NutzerDoc.get().then((snapshot) => {
      const {Count} = snapshot.data();
      const {Timestamp} = snapshot.data();
      
      //Antwort beim Nutzer in Datenbank speichern
      NutzerDoc.collection('Antworten').doc(`${Count}`).update({
      Antwort: Antwortfix});

      //Verfügbare Zeit in Minuten und Sekunden zerlegen, um es leserlicher darzustellen
      //https://www.htmlgoodies.com/html5/javascript/calculating-the-difference-between-two-dates-in-javascript.html
      var Datum1 = new Date();
	  var Datum2 = Timestamp;
      var ZeitDiff = Datum2.getTime() - Datum1.getTime();
	  var diffSek = Math.ceil(ZeitDiff / (1000));
      var diffMinKomma = diffSek / (60);
      var Minuten = Math.ceil((ZeitDiff / (1000*60))-1);
      var SekundenDez = (diffMinKomma - Minuten)*100;
      var Sekunden = (SekundenDez*0.6).toFixed(0);

	  //Überprüfen, ob die Anzahl zu beantwortende Fragen erreicht wurde
      if (Count >= Anzahl){
        
        //Agent Antwort bei nur einer Frage
        if (Anzahl == 1){

        	agent.add(`Ihre Antwort wurde gespeichert. Vielen Dank für Ihre Teilnahme.`);
            
          	//Arrays mit den noch nicht gestellten Fragen beim Nutzer löschen.
          	//https://firebase.google.com/docs/firestore/manage-data/delete-data#fields
            NutzerDoc.update({
            EinfacheFragen: FieldValue.delete(),
            MittelschwereFragen: FieldValue.delete(),
            SchwereFragen: FieldValue.delete()});
          
            
        //Agent Antwort bei mehr als einer Frage
        }else{
          
            agent.add(`Ihre Antwort wurde gespeichert. Sie haben alle ${Anzahl} Fragen beantwortet. Vielen Dank für Ihre Teilnahme.`);
          	
          	//Arrays mit den noch nicht gestellten Fragen beim Nutzer löschen.
          	//https://firebase.google.com/docs/firestore/manage-data/delete-data#fields
            NutzerDoc.update({
            EinfacheFragen: FieldValue.delete(),
            MittelschwereFragen: FieldValue.delete(),
            SchwereFragen: FieldValue.delete()});
          
        }
		
      //Überprüfen, ob die Zeit abgelaufen ist  
      }else if (ZeitDiff <= 0){

        agent.add(`Ihre Antwort wurde gespeichert. Die Verfügbare Zeit ist leider Abgelaufen. Sie haben ${Count} von ${Anzahl} Fragen beantwortet.`);
		//Arrays mit den noch nicht gestellten Fragen beim Nutzer löschen.
        //https://firebase.google.com/docs/firestore/manage-data/delete-data#fields
        NutzerDoc.update({
        EinfacheFragen: FieldValue.delete(),
        MittelschwereFragen: FieldValue.delete(),
        SchwereFragen: FieldValue.delete()});	
        
      //Antwort vom Agent falls nur noch Sekunden übrig sind  
      }else if (Minuten <= 0){
        
        agent.add(`Ihre Antwort wurde gespeichert. Sie haben ${Count} von ${Anzahl} Fragen beantwortet und noch ${Sekunden} Sekunden Zeit zur Verfügung. Was für einen Schwierigkeitsgrad möchten Sie für die nächste Frage? Einfach | Mittel | Schwer`);
        agent.add(new Suggestion(`Einfach`));
        agent.add(new Suggestion(`Mittel`));
        agent.add(new Suggestion(`Schwer`));
       
      //Antwort vom Agent falls Minuten und Sekunden übrig sind  
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

