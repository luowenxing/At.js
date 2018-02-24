# sinaAt
Mentions autocomplete like `At.js` with zero dependency and easy usage if you just want something like sina weibo `@` mentions

# Usage
Open `index.html` and you will see how it works.

# Options
```
{
  fetchList:function(cb){ cb([]) }, // get autocomplete suggestions list with callback
  onAtChange:function(atData) {},   // get all @ data in list when changed.
  seperator:' ', // seperator between @ items
  at:'@', // @ symbol
  getText:function(data) { return data.text } // the text show after @. If null will show list data itself
}
```

