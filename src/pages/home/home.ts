import { Component, ViewChild, ElementRef  } from '@angular/core';
import {NavController, Platform, ToastController} from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';
import { Subscription } from 'rxjs/Subscription';
import { filter } from 'rxjs/operators';
import { Storage } from '@ionic/storage';
import { Socket } from 'ng-socket-io';
import {Observable} from "rxjs/Observable";

declare var google;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  public nickname = Date.now();
  public messages = [];
  public message = '';


  @ViewChild('map') mapElement: ElementRef;
  map: any;
  currentMapTrack = null;
  from = [];
  isTracking = false;
  trackedRoute = [];
  trackedRoute2 = [];
  previousTracks = [];
  socketCall = [];

  positionSubscription: Subscription;
  constructor(
    public navCtrl: NavController,
    private plt: Platform,
    private geolocation: Geolocation,
    private storage: Storage,
    private socket: Socket,
    private toastCtrl: ToastController) {

    this.getMessages().subscribe(data => {
      let datos: any =  Object.assign(data);
      console.log("****************************************")
      console.log(datos)
      console.log("****************************************")
      if(this.from.length==0){
        this.from.push(datos.from);
      }else{
        //for(let i=0; i< this.from.length; i++){
        console.log("cantidad encontrados en array")

        console.log(this.from.filter(filtro => filtro == datos.from).length)
        if(this.from.filter(filtro => filtro == datos.from).length == 0){
          this.from.push(datos.from);
        }
        //}
        console.log(this.from.length);
      }
      ///console.log(this.from);
      console.log("----------------------------------")
      if(this.socketCall.length == 0) {
        this.socketCall.push({from: datos.data.data.de, track: {lat:datos.data.data.lat,lng:datos.data.data.lng}});
      }else{
        for(let i= 0; i<this.from.length; i++){
          if(this.socketCall.filter(socket => socket.from == this.from[i]).length == 0){
            this.socketCall.push({from: datos.data.data.de, track: {lat:datos.data.data.lat,lng:datos.data.data.lng}});
          }
        }
        /*for(let  i = 0; i< this.socketCall.length; i++) {
          for(let j = 0; j<this.from.length;j++) {
            if(this.from[j] == this.socketCall[i].from){
              this.socketCall[i].track = {lat:datos.data.data.lat,lng:datos.data.data.lng}
            }else{
              this.socketCall.push({from: datos.data.data.de, track: {lat:datos.data.data.lat,lng:datos.data.data.lng}});
            }
          }
            //

        }*/
        this.trackedRoute = [];
        for(let  i = 0; i< this.socketCall.length; i++){
          this.trackedRoute.push(this.socketCall[i].track);
        }
      }
      console.log(this.socketCall);
      //this.trackedRoute.push(datos.data.data);
      console.log(this.trackedRoute);
      this.redrawPath(this.trackedRoute);
    });

    this.getUsers().subscribe(data => {
      let user = data['user'];
      if (data['event'] === 'left') {
        this.showToast('User left: ' + user);
      } else {
        this.showToast('User joined: ' + user);
      }
    });

  }
  getUsers() {
    let observable = new Observable(observer => {
      this.socket.on('users-changed', (data) => {
        observer.next(data);
      });
    });
    return observable;
  }
  getMessages() {
    let observable = new Observable(observer => {
      this.socket.on('data', (data) => {
        observer.next(data);
      });
    })
    return observable;
  }
  ionViewDidLoad() {
    this.socket.connect();
    this.socket.emit('set-nickname', this.nickname);

    this.plt.ready().then(() => {
      this.loadHistoricRoutes();
      var pinIcon = {
        url: "assets/imgs/gps.png",
        scaledSize: new google.maps.Size(42, 42)
      };
      let mapOptions = {
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        tilt: 30
      }
      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

      this.geolocation.getCurrentPosition().then(pos => {
        let latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        this.redrawPath2(latLng);
        this.map.setCenter(latLng);
        this.map.setZoom(16);
      }).catch((error) => {
        console.log('Error getting location', error);
      });
    });
  }
  loadHistoricRoutes() {
    this.storage.get('routes').then(data => {
      if (data) {
        this.previousTracks = data;
      }
    });
  }
  sendMessage(data: object) {
    this.socket.emit('send-location', { data });
    this.message = '';
  }
  startTracking() {
    this.isTracking = true;
    this.trackedRoute2 = [];

    this.positionSubscription = this.geolocation.watchPosition()
      .pipe(
        filter((p) => p.coords !== undefined) //Filter Out Errors
      )
      .subscribe(data => {
        setTimeout(() => {
          this.trackedRoute2.push({ lat: data.coords.latitude, lng: data.coords.longitude });
          this.sendMessage({ de: this.nickname ,lat: data.coords.latitude, lng: data.coords.longitude });
          this.redrawPath2(this.trackedRoute2);
        }, 0);
      });

  }

  redrawPath2(path) {
    if (this.currentMapTrack) {
      this.currentMapTrack.setMap(null);
    }

    var pinIcon = {
      url: "assets/imgs/gps.png",
      scaledSize: new google.maps.Size(42, 42)
    };

    if (path.length > 1) {

      //for(let i = 0; i < path.length; i++){
      this.currentMapTrack = new google.maps.Marker({
        position: path[path.length - 1],
        map: this.map,
        title: 'Hello World!',
        icon: pinIcon
      });
      //}

      /*this.currentMapTrack = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#ff00ff',
        strokeOpacity: 1.0,
        strokeWeight: 3
      });*/
      this.currentMapTrack.setMap(this.map);
    }
  }

  redrawPath(path) {
    if (this.currentMapTrack) {
      this.currentMapTrack.setMap(null);
    }

    var pinIcon = {
      url: "assets/imgs/car-icon.png",
      scaledSize: new google.maps.Size(42, 42)
    };

    if (path.length > 0) {

      for(let i = 0; i < path.length; i++){
        this.currentMapTrack = new google.maps.Marker({
          position: path[i],
          map: this.map,
          title: 'Hello World!',
          icon: pinIcon
        });
      }

      /*this.currentMapTrack = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#ff00ff',
        strokeOpacity: 1.0,
        strokeWeight: 3
      });*/
      this.currentMapTrack.setMap(this.map);
    }
  }

  stopTracking() {
    let newRoute = { finished: new Date().getTime(), path: this.trackedRoute };
    this.previousTracks.push(newRoute);
    this.storage.set('routes', this.previousTracks);

    this.isTracking = false;
    this.positionSubscription.unsubscribe();
    this.currentMapTrack.setMap(null);
  }

  showHistoryRoute(route) {
    this.redrawPath(route);
  }

  showToast(msg) {
    let toast = this.toastCtrl.create({
      message: msg,
      duration: 2000
    });
    toast.present();
  }
}
