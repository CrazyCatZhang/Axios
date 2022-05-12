function Axios(config) {
    this.defaults = config;
    this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager(),
    }
}

function InterceptorManager() {
    this.handlers = [];
}

InterceptorManager.prototype.use = function (fulfilled, rejected) {
    this.handlers.push({
        fulfilled,
        rejected
    });
}

Axios.prototype.request = function (config) {
    let promise = Promise.resolve(config);
    const chains = [dispatchRequest, undefined];
    this.interceptors.request.handlers.forEach(item => {
        chains.unshift(item.fulfilled, item.rejected);
    });
    this.interceptors.response.handlers.forEach(item => {
        chains.push(item.fulfilled, item.rejected);
    });
    while (chains.length > 0) {
        promise = promise.then(chains.shift(), chains.shift());
    }
    return promise;
}

function dispatchRequest(config) {
    return xhrAdapter(config).then(response => {
        return response;
    }, error => {
        throw error;
    })
}

function xhrAdapter(config) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(config.method, config.url);
        xhr.responseType = 'json';
        xhr.send();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                //判断成功的条件
                if (xhr.status >= 200 && xhr.status < 300) {
                    //成功的状态
                    resolve({
                        //配置对象
                        config: config,
                        //响应体
                        data: xhr.response,
                        //响应头
                        headers: xhr.getAllResponseHeaders(), //字符串  parseHeaders
                        // xhr 请求对象
                        request: xhr,
                        //响应状态码
                        status: xhr.status,
                        //响应状态字符串
                        statusText: xhr.statusText
                    });
                } else {
                    //失败的状态
                    setTimeout(function () {
                        reject(new Error('请求失败 失败的状态码为' + xhr.status));
                    });
                }
            }
        }
        if (config.cancelToken) {
            config.cancelToken.promise.then(value => {
                xhr.abort();
                reject(new Error('请求已经被取消'));
            })
        }
    });
}

function CancelToken(executor) {
    let resolvePromise;
    this.promise = new Promise((resolve) => {
        resolvePromise = resolve;
    });
    executor(function () {
        resolvePromise();
    });
}

Axios.prototype.get = function (config) {
    return this.request({method: 'GET'});
}

Axios.prototype.post = function (config) {
    return this.request({method: 'POST'});
}

function createInstance(config) {
    const context = new Axios(config);
    const instance = Axios.prototype.request.bind(context);
    Object.keys(Axios.prototype).forEach(key => {
        instance[key] = Axios.prototype[key].bind(context);
    });
    Object.keys(context).forEach(key => {
        instance[key] = context[key];
    });
    return instance;
}