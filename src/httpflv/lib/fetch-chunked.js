import BaseHeader from './baseheader';
import {
    HTTPCANCEL,
    CHUNKEDSTREAM,
    CHUNKEDEND,
    CHUNKEDERR
} from 'lib/constants';


class FetchChunked extends BaseHeader{
    constructor(config){
        super(config);

        this._CANCEL = false;
        this._ERROR = false;

    }
    send(url){
        this._url = url;

        fetch(url)
            .then(res=>{
                let reader = res.body.getReader();

                reader.read().then(function chunkedReader({done,value}){
                    if(this._CANCEL){
                        if(!done){
                            try {
                                console.log('drop this url, ', url);
                                reader.releaseLock();
                                res.body.cancel("the user decide to drop");

                                this._emit(HTTPCANCEL);

                                this._emit(CHUNKEDEND);

                            } catch (error) {
                                console.warn('dont"t support drop(). because you brower don"t support reader.releaseLock() API \n', error);
                            }
                        }
                    }

                    if(done){
                        console.log('====================================');
                        console.log('the chunked connection has stopped');
                        console.log('====================================');

                        this._emit(CHUNKEDEND);
                        return;
                    }

                    this.readChunk(value.buffer);

                    
                    return reader.read().then(chunkedReader.bind(this));
                }.bind(this))
            })
            .catch(err=>{
                this._ERROR = true;
                this._emit(CHUNKEDERR,err);

                throw new Error(err);
            })
    }
    retry(){
        console.log('retry to connect the url,' ,this._url);

        if(this._ERROR){
            return this.send(this._url);
        }

        this.drop()
            .then(() => {
                this.send(this._url);
            })
    }
    drop(){
        this._CANCEL = true;

        return new Promise((res, rej) => {
            this._on(HTTPCANCEL, () => {

                res();
            })
        })

    }
    replace(url){
        console.log('replace the url: ', url);

        this.drop()
        .then(() => {
            this.send(url);
        })

    }
    _init(){
        this._CANCEL = false;
        this._ERROR = false;
    }
}