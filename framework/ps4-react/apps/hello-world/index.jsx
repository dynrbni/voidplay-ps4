// SPDX-License-Identifier: GPL-3.0-only
import { useEffect, useState } from 'react';
import { AppRegistry, View, Text, Controller } from '@ps4-react/core';
function App() {
  const [count,setCount]=useState(0);
  useEffect(()=>Controller.subscribe(action=>{if(action==='confirm')setCount(value=>value+1);if(action==='back')setCount(0);}),[]);
  return <View style={{width:1920,height:1080,padding:96,gap:36,backgroundColor:'#101216'}}>
    <Text style={{fontSize:56,color:'#F4F4F4'}}>PS4 React</Text>
    <View style={{width:1728,height:4,backgroundColor:'#4C596B'}}/>
    <Text style={{fontSize:84,color:'#FFFFFF'}}>Hello World</Text>
    <Text style={{fontSize:28,color:'#B9BEC6'}}>React - QuickJS - native framebuffer</Text>
    <View style={{flexDirection:'row',gap:24,padding:24,backgroundColor:'#242A33'}}>
      <Text style={{fontSize:28}}>Cross / Enter</Text>
      <Text style={{fontSize:28,color:'#B9BEC6'}}>Count: {count}</Text>
    </View>
    <Text style={{fontSize:21,color:'#B9BEC6'}}>Circle / Backspace resets. Close the PS4 app from the PS menu.</Text>
  </View>;
}
AppRegistry.registerComponent('hello-world',()=>App);
