//add by Li at 2016-10-19

~function (global,undefined) {
    global.log = console.log;

    var alias = {};
    var ns = {};

    global.seekjs = {
        config: function (ops) {
            var _ns = ops.ns || {};
            for (var k in _ns) {
                var item = _ns[k];
                ns[k] = item.path ? item : {path:item, type:".js"};
            }
            alias = ops.alias || {};
        }
    };

    //加载CSS文件
    var loadCss = function (path) {
        var style = document.createElement("link");
        style.rel = "stylesheet";
        style.type = "text/css";
        style.href = path;
        document.head.appendChild(style);
    };

    //获取代码
    var getCode = function (path) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", path, false);
        xhr.send();
        return xhr.responseText;
    };

    //获取真实路径
    var getPath = function (mid) {
        if(node_sys_module_re.test(mid)){
            return ns["sys."].path + "/node/" + mid + ".js";
        }
        var isAlias = false;
        for(let k in alias){
            if(mid==k){
                mid = alias[k];
                isAlias = true;
                break;
            }
        }
        var isNs = false;
        for(let k in ns) {
            if(mid.startsWith(k)){
                var o = ns[k];
                mid = mid.replace(k, o.path);
                if(o.type && mid.includes(".")===false){
                    mid += o.type;
                }
                isNs = true;
                break;
            }
        }
        if(!isNs && !/^[\.\/]/.test(mid)){
            if(mid.startsWith("seek-plugin-")) {
                mid = `/node_modules/${mid}/index.sk`;
            }else{
                var code = getCode(`/node_modules/${mid}/package.json`);
                var pk = parseModule(`module.exports=${code}`);
                mid = `/node_modules/${mid}/${pk.main}`;
            }
        }
        if(!/\.\w+$/.test(mid)){
            mid += ".js";
        }
        return mid;
    };

    var modules = {};

    //解析模块
    var parseModule = global.parseModule = function (code, file, iniExports) {
        var require = function (mid) {
            return getModule(mid);
        };
        var module = {};
        module.resolve = function(path){
            return path;
        };
        var exports = module.exports = iniExports || {};

        code = `
        \n\n\n
        ${code}
        \n\n\n
        return module.exports;`;
        if(file) {
            code += `\n\n//# sourceURL=${file}`;
        }
        return new Function("require", "exports", "module", "dirname", "filename", code)(require, exports, module, file, file);
    };

    var iii=0;
    //加载模块
    var getModule = global.getModule = function (mid) {
        if(++iii==99999){
            throw "call times is too more!";
        }
        if (!modules[mid]) {
            var path = getPath(mid);
            var file = path.split("/").pop();
            if (path.endsWith(".css")) {
                modules[mid] = path;
                loadCss(path);
            }else {
                var code = getCode(path);
                if(path.endsWith(".js")) {
                    modules[mid] = parseModule(code, file);
                }else if(path.endsWith(".json")) {
                    modules[mid] = JSON.parse(code);
                }else {
                    modules[mid] = code;
                }
            }
        }
        return modules[mid];
    };

    var lastScript = [...document.scripts].pop();
    ns["root."] = {
        path: location.href.replace(/#.*$/,"").replace(/\w+\.html/,"")
    };
    ns["sys."] = {
        path: lastScript.src.replace(/\w+\.js/,"")
    };
    
    var code = getCode(ns["sys."].path + "/node/node_sys_files.json");
    code = new Function(`return ${code}`)().join("|");
    var node_sys_module_re = new Function(`return /^(${code})$/`)();

    var main = lastScript.dataset.main;
    if(main){
        window.onload = function() {
            getModule(main);
        };
    }
}(window);