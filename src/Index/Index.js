// HoiHD
import React, { Component } from 'react';
import { 
    View, Text, Alert, BackHandler, ToastAndroid, ActivityIndicator
} from 'react-native';
import firebase from 'react-native-firebase';
import WebView from 'react-native-webview';
import SplashScreen from 'react-native-splash-screen';
import AsyncStorage from "@react-native-community/async-storage";
// import Share from 'react-native-share';
let URL = "";
export default class Index extends Component {
    constructor(props) {
        super(props);
        this.state = {
            firebase_token: "", loading: true,
            uri: "https://app.histay.vn/", method: "", body: "",
        };
        this.lastBackButtonPress = null;
    }
    componentDidMount() {
        SplashScreen.hide();
        BackHandler.addEventListener("hardwareBackPress", this.handleBackPress);
        this.checkPermission();
        this.messageListener();
    }
    componentWillUnmount() {
        BackHandler.removeEventListener("hardwareBackPress", this.handleBackPress);
    }

    // Lưu firebase_token vào trong database local
    storageFirebaseToken = (firebase_token) => {
        AsyncStorage.setItem("firebase_token", firebase_token);
    }
    // Kiểm tra quyền lấy firebase_token
    checkPermission = async() =>{
        const enabled = await firebase.messaging().hasPermission();
        if (enabled) {
            this.getFcmToken();
        }
        else {
            this.requestPermission();
        }
    }
    // Lấy ra firebase_token, Kiểm tra nếu trong database đã lưu firebase_token này rồi
    // thì sẽ không tạo nữa. Đỡ tốn thời gian :D
    getFcmToken = async() => {
        const firebase_token = await firebase.messaging().getToken();
        let async_firebase_token = await AsyncStorage.getItem("firebase_token");  
        if (firebase_token) {
            this.setState({firebase_token});
            if (firebase_token != async_firebase_token) {
                this.storageFirebaseToken(firebase_token);
                this.setState({
                    // source: {...source, ...{method: "POST", body: 'firebase_token=' + firebase_token}},
                    method: "POST", body: 'firebase_token=' + firebase_token,
                    loading: false,
                })
            } else {
                this.setState({loading: false});
            }
        } else {
            console.log("Lỗi!, Không thể lấy ra firebase_token. Vui lòng kiểm tra lại!");
        }
    }
    // Yêu cầu quyền lấy firebase_token
    requestPermission = async() => {
        try {
            await firebase.messaging().requestPermission();
        } catch (error) {
            console.log(error);
        }
    }
    // Xử lý việc lấy thông báo
    messageListener = async() =>{
        this.notificationListener = firebase.notifications().onNotification((notification) => {
            const {title, body, notificationId, data} = notification;
            if (Object.keys(data).length != 0) {
                URL = data.redirect;
            }
            this.displayNotification(title, body, notificationId);
        });
        this.notificationOpenedListener = firebase.notifications().onNotificationOpened((notificationOpen)=>{
            this.setState({loading: true});
            const { data } = notificationOpen.notification;
            if (Object.keys(data).length != 0) {
                this.setState({ uri: data.redirect });
            }
            this.setState({uri: URL});
            firebase.notifications().removeDeliveredNotification(notificationOpen.notification.notificationId);
            this.setState({loading: false});
        });

        const notificationOpen = await firebase.notifications().getInitialNotification();
        if (notificationOpen) {
            const {title, body, notificationId, data} = notificationOpen.notification;
            if (Object.keys(data).length != 0) {
                this.setState({uri: data.redirect})
                URL = data.redirect;
            }
            this.displayNotification(title, body, notificationId);
        }

        this.messageListener = firebase.messaging().onMessage((message)=>{
            console.log(JSON.stringify(message));
        })
    }
    // Hiển thị thông báo
    displayNotification = (title, body, notificationId) => {
        // build a channel 
        const channel = new firebase.notifications.Android.Channel("hi_stay", 'Hi Stay', firebase.notifications.Android.Importance.Max).
        setDescription("Notification for HiStay App")
        firebase.notifications().android.createChannel(channel);
        const notificationShow = new firebase.notifications.Notification().
            setNotificationId(notificationId).
            setTitle(title).setBody(body);
        notificationShow.android.setLargeIcon("https://app.histay.vn/public/project/crmapp/header/section/001/image/favicon.png");
        notificationShow.android.setChannelId(channel.channelId).android.setSmallIcon('ic_launcher');
        firebase.notifications().displayNotification(notificationShow);
    }
    // Khóa nút back của android
    handleBackPress = () => {
        if ((this.refWebView.startUrl == "https://app.histay.vn/backend/home/index.html") || (this.refWebView.startUrl == "https://app.histay.vn/backend/auth/login.html")) {
            if (this.lastBackButtonPress + 2000 >= (new Date).getTime()) {
                BackHandler.exitApp();
            }
            this.lastBackButtonPress = (new Date).getTime();
            ToastAndroid.show("Nhấn BACK thêm lần nữa để thoát ứng dụng", ToastAndroid.SHORT)
            return true;
        }
        this.refWebView.goBack();
        return true;
    }
    handleWebViewNavigationStateChange = (newNavState) => {
        const {url} = newNavState;
        if (!url) return;
    }
    nativeShare = async(data) => {
        console.log(data);
        await Share.open({url: data});
    }
    render() {
        if (this.state.loading) {
            return (
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{fontFamily: 'Arial', fontSize: 18}}>Đang tải dữ liệu...</Text>
                    <View style={{height: 5}}/>
                    <ActivityIndicator animating size="large"/>
                </View>
            )
        }
        return (
            <View style={{flex: 1}}>
                <View style={{flex: 7}}>
                    <WebView 
                        renderError={()=>Alert.alert(
                            "Lỗi kết nối!",
                            "Vui lòng kiểm tra mạng. \nHoặc liên hệ với quản trị viên để được giải quyết!",
                            [
                                {text: "Tải lại trang", onPress: () => {this.refWebView.reload()}},
                                {text: "Thoát ứng dụng", onPress: () => {BackHandler.exitApp()}},
                            ],
                            {cancelable: false})}
                        ref={ref=>this.refWebView=ref}
                        source={{
                            uri: this.state.uri,
                            method: this.state.method,
                            body: this.state.body,
                        }}
                        onNavigationStateChange={this.handleWebViewNavigationStateChange}
                        onMessage={event => {this.nativeShare(event.nativeEvent.data)}}
                        
                    />
                </View>
            </View>
        );
    }
}