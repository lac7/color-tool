import React from 'react';
import ReactFileReader from 'react-file-reader';
import { useState, useRef } from 'react';
import "./breakpoints.css";
import './styles.css';
import renderDownload from './download';
import renderBeforeAfter from './beforeafter';
import renderSearch from './paletteSearch';
import manualSearch from './manualSearch.js';


var $ = require("jquery");
var fileDownload = require("js-file-download");


const ColorTool = () => {
  const [palettesFound, setPalettesFound] = useState([]);
  const [currentPalettes, setCurrentPalettes] = useState([]);
  const [el, setEl] = useState(null);
  const [filebytes, setFilebytes] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [filename, setFilename] = useState("");
  const searchTermsRef = useRef();
  const [manual, setManual] = useState({
    address: "",
    numBytes: ""
  });
  const [prgEnd, setPrgEnd] = useState(0);

  var sixtyFourToString = sixtyfour => {
    var raw = atob(sixtyfour);
    var result = "";

    for (var i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i));
    }

    return result;
  }

  var trim = sixtyfour => {
    return sixtyfour.slice(sixtyfour.search(",") + 1);
  }

  var paletteHeaderMatch = (romString, ind) => {
    if (romString.charCodeAt(ind) !== 0x3F) {
      return [];
    }
    if (romString.length <= ind + 2) {
      return [];
    }

    var begin = romString.charCodeAt(ind + 1);
    var count = romString.charCodeAt(ind + 2);
    var result = [0x3F, begin, count];

    if (romString.length <= ind + count + 2) {
      return [];
    }

    if (begin + count > 0x20) {
      return [];
    }

    if (count < 1) {
      return [];
    }

    for (var i = 0; i < count; i++) {
      var byt = romString.charCodeAt(ind + i + 3);
      if (byt > 0x3F) {
        return [];
      }
      result.push(byt);
    }

    return result;
  }

  var findPalettes = romString => {
    // return array of `paletteResult` objects, each element in the array corresponds to a different
    // 3F palette

    var result = [];

    for (var i = 0; i < romString.length; i++) {
      var headerMatch = paletteHeaderMatch(romString, i);
      if (headerMatch.length !== 0) {
        result.push({
          loc: i,
          data: headerMatch
        })
      }
    }

    return result;
  }

  var nesColors = [	"#545354", "#071e70", "#090f8a", "#2c0381", "#3e0660", "#540c30", "#4c0e06", "#371a04",
            "#232a07", "#183a0b", "#183f0c", "#153b0a", "#12313a", "#010100", "#010100", "#010100",
            "#989698", "#214abd", "#3032e2", "#5523db", "#7c20a9", "#932562", "#8c2d27", "#703f13",
            "#565919", "#3d701d", "#367a20", "#337433", "#2b6575", "#000001", "#000001", "#010100",
            "#edeeec", "#6098e6", "#797ce5", "#a666e4", "#d35ee5", "#da62b1", "#dc7169", "#ca8c3a",
            "#a1aa35", "#87c23b", "#73cd46", "#68c976", "#5fb1ca", "#3b3b3d", "#000000", "#010100",
            "#edeeec", "#afcbe9", "#bcbde8", "#cfb3e8", "#ebaeec", "#ebaed4", "#e4b6b2", "#dfc597",
            "#ccd183", "#bddd84", "#b4e099", "#a8e1b8", "#abd5e2", "#a0a1a0", "#000001", "#010100"];

  var textColors = [	"white", "white", "white", "white", "white", "white", "white", "white",
            "white", "white", "white", "white", "white", "white", "white", "white",
            "white", "white", "white", "white", "white", "white", "white", "white",
            "white", "white", "white", "white", "white", "white", "white", "white",
            "black", "white", "white", "white", "white", "white", "white", "white",
            "white", "white", "white", "white", "white", "white", "white", "white",
            "black", "black", "black", "black", "black", "black", "black", "black",
            "black", "black", "black", "black", "black", "black", "white", "white"];

  var getNesColor = byt => {
    return nesColors[byt];
  }

  var getTextColor = byt => {
    return textColors[byt];
  }

  var firstClicked = (e, paletteNum, colorNum) => {
    setEl([paletteNum, colorNum]);
  }

  var secondClicked = (e, color) => {
    // console.log(palettesFound);
    setCurrentPalettes(before => {
      var result = [...before];
      // console.log(result);
      result[el[0]].data[el[1]] = color;
      return result;
    });
  }

  var getPickerElement = num => {
    return (
    <div onClick={e => secondClicked(e, num)} className="grid-item2" style={{backgroundColor: getNesColor(num), color: getTextColor(num)}}>
      {num.toString(16).toUpperCase().padStart(2, "0")}
    </div>);
  }

  var handleFiles = file => {
    var sixtyfour = trim(file.base64);
    var filestring = sixtyFourToString(sixtyfour);
    setFilename(file.fileList.item(0).name);

    var prgOffset = (filestring.charCodeAt(4)) * 16384;
    var trainerOffset = ((filestring.charCodeAt(6) / 4) % 2) * 512;
    var header = 16;
    var prgEnd = prgOffset + trainerOffset + header;
    setPrgEnd(prgOffset + trainerOffset + header);

    var palettes = findPalettes(filestring);
    setFilebytes(filestring);
    palettes = palettes.filter(palette => palette.loc <= prgEnd);

    var toMakePalettes = palettes.map(palette => {
      var result = {};
      result.loc = palette.loc + 3;
      result.data = palette.data.filter((e, i) => i >= 3);
      return result;
    });

    // making copies of the palette
    var stringCopy = JSON.stringify(toMakePalettes);
    setPalettesFound(JSON.parse(stringCopy));
    setCurrentPalettes(JSON.parse(stringCopy));
  }

  // manualSearch stuff:
  function handleChange(evt) {
    const value = evt.target.value;
    setManual({
      ...manual,
      [evt.target.name]: value
    });
  }

  function handleClick() {
    var address = manual.address;
    var numBytes = manual.numBytes;
    var bytes1 = manualSearch(address, numBytes, filebytes);
    var bytes2 = manualSearch(address, numBytes, filebytes);
    setPalettesFound([
      ...palettesFound,
      bytes1
    ])
    setCurrentPalettes([
      ...currentPalettes,
      bytes2
    ])
  }


  return (<>
        <section id="main-content">Step-By-Step Process</section>

        <section id="description"><p>Welcome to Our Tool!</p></section>

        <section id="subtitle">1. File Upload</section>

        <section id="description">
            <p>Get started by uploading the game file you want to alter.</p>
        </section>


        <div style={{float: "left", "paddingLeft": "100px", "paddingTop": "17px"}}>
    		<ReactFileReader fileTypes="" base64={true} multiple={false} handleFiles={handleFiles}>
    			<label htmlFor="actual-btn" style= {{"fontFamily": "monospace"}}>Choose File</label>
    		</ReactFileReader>
        </div>

        <section id="subtitle" style={{"paddingTop": "80px"}}>2. Customization</section>

        <section id="description">
            <p>Interact with our before and after display of the palettes in your game. Click on the specific index of the color you want to change in the ???after??? column. Then, explore the color grid containing all possible NES colors used in games and choose one to switch your chosen index to.</p>
        </section>

        <section id="subtitle1" style = {{"paddingLeft" : "290px", "fontSize":"18px"}}>NES Color Grid</section>

    	{renderBeforeAfter(palettesFound, currentPalettes, firstClicked, secondClicked, getNesColor, getTextColor)}

    	<div class="grid-container2" style={{"paddingLeft": "150px"}}>
    	{[...Array(64).keys()].map(getPickerElement)}
    	</div>

    	<div style={{display: "inline-block", "float": "left", "paddingLeft": "5px", "marginLeft": "153px", height: "138px", width: "430px", border: "1px solid #ccc", "overflow-y": "auto"}}>
    	<section id="subtitle" style={{"textAlign":"center", "marginRight":"30px", "paddingTop":"10px"}}>Byte Search</section>
    	<section id="description"><p style={{"textAlign":"center"}}>If known, enter the hex address and the number of bytes of your palette. Values are added to the bottom of the table.</p></section>
    		<div class="example">
        <input type="text" placeholder="Enter Address.." name="address" value={manual.address} onChange={handleChange} style={{"marginLeft":"20px"}}></input>
        <input type="text" placeholder="Number of Bytes.." name="numBytes" value={manual.numBytes} onChange={handleChange} style={{"marginLeft":"20px"}}></input>
        <button onClick={handleClick}><i class="fa fa-search"></i>Search</button>
        </div>
    	</div>

    	<div style={{display: "inline-block", "paddingLeft": "5px", "marginTop":"20px", "float":"left", "marginLeft": "20px", height: "300px", width: "680px", border: "1px solid #ccc", "overflow-y": "auto"}}>
    	<section id="subtitle" style={{"textAlign":"center", "marginRight":"30px", "paddingTop":"10px"}}>Palette Search</section>
    	<section id="description"><p style={{"textAlign":"center"}}>If known, enter the hex values of your palette. Select which ones to add to your table.</p></section>
    		<div class="example1">{renderSearch(searchTermsRef, palettesFound, currentPalettes, setPalettesFound, setCurrentPalettes, getNesColor, getTextColor, searchResults, setSearchResults, filebytes, prgEnd)}</div>
    	</div>

    	<div style={{"marginTop":"500px"}}>
        <section id="subtitle">3. Download</section>

        <section id="description">
            <p>Download your new patch file to your device. Happy playing!</p>
        </section>

    		<div class="example2">{renderDownload(currentPalettes, filename, filebytes)}</div>
    	</div>

        <footer>
                Summer Research, 2021.
        </footer>
    	</>);


    }

export default ColorTool;
