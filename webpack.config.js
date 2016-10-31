var webpack = require('webpack');
var path = require('path');

var port = process.env.PORT || 8080;

module.exports = {
    port: port,	
    entry: "./src/main.jsx",
    output: {
        path: __dirname + "/build/",
        filename: "app.js"
    },
    module: {
	preLoaders: [
             { test: /\.json$/, loader: 'json'},
        ],
        loaders: [ {
            	 test: /\.jsx?$/, 
    		 exclude: /node_modules/,
		 include: path.join(__dirname, "src"), 
    		 loader: "babel", 
    		 query:
     		 {
        		presets:['es2015', 'react']
      		 }
            }, { 
		test: /\.css$/, 
		loader: "style!css" 
	    },
	{
        	test: /\.less$/,
        	loader: "style!css!less"
      	},
	{     
		test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/, 
		loader: 'file' 
	}]
    },
    resolve: {
        extensions: ['', '.js', '.jsx']	
    }
};
