// HoiHD
import RNFetchBlob from 'rn-fetch-blob';
import Share from 'react-native-share';
import {
    PermissionsAndroid, ToastAndroid, Alert, Platform
} from 'react-native';
const title = "Chia sẻ dữ liệu";
const _shareImage = async(pics, message) => {
    try {
        ToastAndroid.show("Đang chuẩn bị tải dữ liệu. Vui lòng chờ trong 3-5 giây.", ToastAndroid.LONG);
        const checkVersion = Platform.Version > 22;
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
                title: "Access Require",
                message: "Press Allow Permission to start progress"
            }
        );
        //cannot progress without permission || sdk < 23 bypass
        if (granted !== PermissionsAndroid.RESULTS.GRANTED && checkVersion) {
            Alert.alert("Cancel, permission denied");
            return;
        }
        if (pics.length == 0) {
            Share.open({title, message}).then((res) => {console.log(res)}).catch((err) => {
                err && console.log(err)
            });
        } else if (pics.length == 1) {
            RNFetchBlob.fetch("GET", pics[0]).then(resp => {
                let imageBase64 = resp.data;
                Share.open({
                    title, message, url: "data:image/png;base64," + imageBase64
                }).then((res) => {console.log(res)}).catch((err) => {err && console.log(err)});
            }).catch(err => {console.log(err)})
        } else {
            let Pictures = pics.map(item =>
                RNFetchBlob.config({
                    fileCache: true
                })
                    .fetch("GET", item)
                    .then(resp => {
                        let base64s = RNFetchBlob.fs
                            .readFile(resp.data, "base64")
                            .then(data => "data:image/png;base64," + data);
                        return base64s;
                    })
            );
            Promise.all(Pictures).then(completed => {
                const options = {
                    title: "Chia sẻ dữ liệu",
                    urls: completed,
                };
                Share.open(options).then((res) => {console.log(res)}).catch((err) => {err && console.log(err)})
            });
        }
    } catch (error) {
        Alert.alert("Error, Permission denied", error);
    }
} 

export default _shareImage;