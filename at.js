(function(window){

    function at(textarea,options) {
        // 创建隐藏的div.contentEditable
        var parent = textarea.parentNode
        var hiddenObj = ctor('div')
        var atList = ctor('ul')
        var colorAtLabel = ctor('label')
        hiddenObj.contentEditable = true
        hiddenObj.style = textarea.style
        hiddenObj.style.position = 'absolute'
        hiddenObj.style.top = 0
        hiddenObj.style.left = 0
        hiddenObj.style.visibility = 'hidden'
        hiddenObj.className = textarea.className

        atList.className = 'at-list'
        atList.style.zIndex = 10002

        parent.style.position = "relative"
        parent.appendChild(hiddenObj)
        parent.appendChild(atList)


        var defaultOptions = {
            fetchList:function(cb){ cb([]) },
            onAtChange:null,
            seperator:' ',
            at:'@'
        }

        extend(defaultOptions,options)
        extend(this,defaultOptions)

        this.atData = []
        this.listData = []
        this.textarea = textarea
        this.hiddenObj = hiddenObj
        this.atList = atList
        this.prevCursorPosition = 0


        if (textarea.addEventListener) {
            textarea.addEventListener("keyup", this.objChange.bind(this), false)
            textarea.addEventListener("mouseup", this.objChange.bind(this), false)
        } else if (textarea.attachEvent) {
            textarea.attachEvent("onkeyup", this.objChange.bind(this))
            textarea.attachEvent("onmouseup", this.objChange.bind(this))
        }
    }

    at.prototype.objChange = function(event) { 
        var atList = this.atList,
            fetchList = this.fetchList,
            textarea = this.textarea,
            hiddenObj = this.hiddenObj,
            key = event.keyCode,
            that = this,objString,cursorPosition,beforeCursorString,
            atLocation,indexString,positionString
            loadPositions = function() {
                //取值
                objString = this.textarea.value,
                //记录光标当前位置
                cursorPosition = posCursor(this.textarea),
                //光标之前的字符串
                beforeCursorString = objString.substr(0, cursorPosition),
                //记录@在光表前出现的最近的位置
                atLocation = beforeCursorString.lastIndexOf(that.at),
                //记录光标和光标前最近的@之间的字符串，记为标识符，判断其是否含有空格
                indexString = objString.substr(atLocation, cursorPosition - atLocation),
                //记录从开始到光标前最近的@之间的字符串，用来定位
                positionString = objString.substr(0, atLocation)
            }
            
        loadPositions()
        // 如果是删除
        if(key == 8) {
            this.handleDelete(atLocation,cursorPosition)
            // 重新取一遍光标值
            loadPositions()
        }

        if (atList.style.display == "block") {
            var listClick = [].slice.call(atList.getElementsByTagName("li"))
            var len = listClick.length
            var liIndex = getLiIndex(listClick, "list-active")

            if (key == 40) { // 下
                cursorHandle(textarea,cursorPosition)
                var next = liIndex == len - 1 ? 0 : liIndex
                listClick.forEach(function(li){
                    removeClass(li, "list-active")
                })
                addClass(listClick[next + 1], "list-active")
                return false
            } else if (key == 38) { // 上
                cursorHandle(textarea,cursorPosition)
                var prev = liIndex == 1 ? len : liIndex
                listClick.forEach(function(li){
                    removeClass(li, "list-active")
                })
                addClass(listClick[prev - 1], "list-active")
                return false
            } else if (key == 13) { // 回车enter

                var selectedStr = listClick[liIndex].innerHTML
                this.handleString(liIndex - 1,selectedStr, atLocation, cursorPosition)
                return false
            }
        }

        if (beforeCursorString.indexOf(that.at) != -1 && indexString.indexOf(that.seperator) == -1 && indexString.indexOf('\n') == -1) {
        //@开始
            if(key >= 37 && key <=40) {
                // 上下左右，直接返回
                return 
            }

            var query = indexString.replace(that.at,'')

            // 从远端拉取数据
            fetchList(query,function(list){
                that.listData = list
                if(list.length === 0) {
                    // 无结果
                    atList.innerHTML = '<li class="list-title">暂无搜索结果</li>'
                } else if(list.length > 0) {
                    // 渲染atList
                    atList.innerHTML = list.reduce(function(dom,item){
                        return dom + '<li class="list-content">' + that.getText(item) + '</li>'
                    },'<li class="list-title">选择最近@的人或直接输入</li>')
                    // 绑定鼠标事件
                    var listClick = [].slice.call(atList.getElementsByTagName("li"))
                    listClick[1].className = 'list-content list-active'
                    listClick = listClick.slice(1)
                    listClick.forEach(function(li,index){
                        li.onmouseover = function(){
                            listClick.forEach(function(li){
                                removeClass(li, "list-active")
                            })
                            addClass(li, "list-active")
                        }
                        li.onclick = function(){
                            that.handleString(index,li.innerHTML,atLocation,cursorPosition)
                        }
                    })
                }

                // 定位atList，通过hidden contentEditable div来模拟
                atList.style.display = 'block'
                hiddenObj.innerHTML = positionString.replace(/\n/g, "<br/>") + '<span id="at">@</span>'
                var at = getById("at")
                atList.style.left = getXY(at).left + 2 + 'px'
                atList.style.top = getXY(at).top - textarea.scrollTop + 18 + 'px'
            })
        } else {
            atList.innerHTML = ''
            atList.style.display = 'none'
        }
        this.prevCursorPosition = cursorPosition

    }

    at.prototype.handleString = function(index,selectedStr,atLocation, cursorPosition) {
        //将textarea分成三块，@之前的area1、@+联系人+' '的area2、光标之后的area3
        var data = this.listData[index]
        if(this.addAtData(data,atLocation)) {
            var objString = this.textarea.value
            var area1 = objString.substr(0, atLocation)
            var area2 = this.at + selectedStr + this.seperator
            var area3 = objString.substr(cursorPosition, getLength(objString) - cursorPosition)

            this.textarea.value = area1 + area2 + area3
            this.atList.innerHTML = ''
            this.atList.style.display = 'none'
            this.onAtChange(this.atData)

            //定位光标
            var position = area1.length + area2.length
            cursorHandle(this.textarea, position)

        }
    }

    at.prototype.handleDelete = function(atLocation,cursorPosition) {
        var prevCursor = this.prevCursorPosition
        var objString = this.textarea.value
        var length = this.atData.length  
        if(length > 0) {
            var result = this.removeAtData(prevCursor,cursorPosition)
            if(result.success) {
                var offset = cursorPosition - result.startLocation
                this.atList.innerHTML = ''
                this.atList.style.display = 'none'
                this.onAtChange(this.atData)

                this.atData.filter(function(data){
                    return data.location >= result.startLocation
                }).forEach(function(data) {
                    data.location -= offset + 1
                    data.end -= offset + 1
                })
                
            }
        }
    }

    at.prototype.addAtData = function(data,atLocation) {
        if(this.atData.filter(function(data){
            return data.location == atLocation
        }).length === 0){
            this.atData.push({
                location:atLocation,
                end:atLocation + this.getText(data).length,
                data:data
            })
            this.atData.sort(function(a,b){
                return a.location > b.location ? 1 : -1
            })
            return true
        }
        return false
    }
 
    at.prototype.removeAtData = function(prevCursor,nowCurcor) {
        var removeAtData = this.atData.filter(function(data){
            return data.location < prevCursor && data.end + 1 >= nowCurcor
        })
        var startLocation = removeAtData[0] && removeAtData[0].location
        removeAtData.forEach(function(data){
            var index = this.atData.indexOf(data)
            this.atData.splice(index,1)
        }.bind(this))
        return {
            success:removeAtData.length > 0,
            startLocation:startLocation
        }
    }

    // 兼容list数据是对象的情况，如果是对象则取text属性
    at.prototype.getText = function(item) {
        return (typeof item === 'object' ? item.text : item)
    }

    // 辅助方法    
    function getXY(obj) {
        var rect = obj.getBoundingClientRect(),
        scrollTop = document.body.scrollTop || document.documentElement.scrollTop,
        scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft,
        isIE = !(!document.all) ? 2 : 0
        var position = {}
        position.left = rect.left - isIE + scrollLeft
        position.top = rect.top - isIE + scrollTop
        return position
    }

    //你懂的
    function getById(obj) {
        return document.getElementById(obj)
    }

    function ctor(tag) {
        return document.createElement(tag)
    }

    // 统计光标之前的字符串
    function posCursor(obj) {
        var isIE = !(!document.all)
        var end = 0
        if (isIE) {
            var sTextRange = document.selection.createRange()
            if (sTextRange.parentElement() == obj) {
                var oTextRange = document.body.createTextRange()
                oTextRange.moveToElementText(obj)
                for (end = 0;oTextRange.compareEndPoints('StartToEnd', sTextRange) < 0;end++) {
                    oTextRange.moveStart('character', 1)
                }
                for (var i = 0;i <= end;i++) {
                    if (obj.value.charAt(i) == '\n') {
                        end++
                    }
                }
            }
        } else {
            end = obj.selectionEnd
        }
        return end
    }

    // 统计字符串总长度中文字符为2，英文字符及数字为1
    function getLength(obj) {
        var realLength = 0, len = obj.length, charCode = -1
        for (var i = 0;i < len;i++) {
            charCode = obj.charCodeAt(i)
            if (charCode >= 0 && charCode <= 128) {
                realLength += 1
            } else {
                realLength += 2
            }
        }
        return realLength
    }

    //class操作
    function hasClass(ele, cls) {
        return ele.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'))
    }
    function addClass(ele, cls) {
        if (!hasClass(ele, cls)) {
            ele.className += " " + cls
        }
    }
    function removeClass(ele, cls) {
        if (hasClass(ele, cls)) {
            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)')
            ele.className = ele.className.replace(reg, ' ')
        }
    }

    //根据class获取当前激活的li的索引
    function getLiIndex(arr, cls) {
        for (var i = 1 ;i < arr.length ;i++) {
            if (hasClass(arr[i], cls)) {
                return i
            }
        }
        return false
    }

    //定位光标位置
    function cursorHandle(obj, pos) {
        if (navigator.appName == "Microsoft Internet Explorer") {
            var range = obj.createTextRange()
            range.move("character", pos)
            range.select()
        } else {
            obj.setSelectionRange(pos, pos)
            obj.focus()
        }
    }

    function extend(to,from) {
        for(var x in from) {
            to[x] = from[x]
        }
    }
    
    // 数组方法兼容IE8
    ;(function polyfill() {
        Array.prototype.forEach = Array.prototype.forEach || function(cb) {
            for(var i = 0;i < this.length;i ++) {
                cb(this[i],i)
            }
        }
        Array.prototype.map = Array.prototype.map || function(transfer) {
            var result = []
            for(var i = 0;i < this.length;i ++) {
                result.push(transfer(this[i]))
            }
            return result
        }
        Array.prototype.reduce = Array.prototype.reduce || function(reducer,initial) {
            for(var i = 0;i < this.length;i ++) {
                initial = reducer(initial,this[i])
            }
            return initial
        }
        Array.prototype.findIndex = Array.prototype.findIndex || function(condition){
            for(var i=0;i<this.length;i++) {
                if(condition(this[i])) {
                    return i
                }
            }
            return -1
        }
        String.prototype.repeat = function(n) {
            var _this = this;
            var result = '';
            for(var i=0;i<n;i++) {
                result += _this;
            }
            return result
        }
    })()

    window.at = at
})(window)

