module.exports.logger = console.log;

function log(message)
{
	if(module.exports.logger !== null)
	{
		module.exports.logger(message);
	}
}

function logError(message)
{
	log("ERROR: " + message);
}

function logUsage()
{
	log("USAGE: \"node validateJSON.js <path-to-json-file> <path-to-schema-file>\"");
}

function exit(exitCode)
{
	process.exit(exitCode);
}

function getCommandLineArgument(commandLineArgumentIndex, errorMessage)
{
	var commandLineArgument = process.argv[commandLineArgumentIndex];
	if(!commandLineArgument)
	{
		logError(errorMessage);
		logUsage();
		exit(-1);
	}
	else
	{
		return commandLineArgument;
	}
}

function getFileContents(filePath)
{
	var fs = require("fs");
	try
	{
		return fs.readFileSync(filePath, "utf8");
	}
	catch(error)
	{
		if(error.code === "ENOENT")
		{
			logError("Could not find file: \"" + error.path + "\"");
		}
		else
		{
			logError("Unrecognized error: " + error);
		}
		exit(-1);
	}
}

function getErrorMessage(prefix, value, suffix)
{
	var errorMessage = prefix;
	if(value === undefined)
	{
		errorMessage += "n";
	}
	else if(value === "")
	{
		errorMessage += "n empty";
	}
	
	if(value !== "")
	{
		errorMessage += " " + value;
	}
	errorMessage += " " + suffix;
	
	return errorMessage;
}

/**
 * Validates the provided JSON object against the provided schema.
 * @param {Object} json
 * @param {Object} schema
 * @return {Object}
 */
module.exports.validate = validate;
function validate(json, schema, externalSchemas)
{
	if(!json)
	{
		logError(getErrorMessage("Cannot validate a", json, "json object."));
		return { valid: false, errors: [ { message: "Invalid JSON" } ], missingExternalSchemas: [] };
	}
	else if(!schema)
	{
		logError(getErrorMessage("Cannot use a", schema, "schema for validation."));
		return { valid: false, errors: [ { message: "Invalid schema" } ], missingExternalSchemas: [] };
	}
	else
	{
		var tv4 = require("tv4");
        
        if(externalSchemas && externalSchemas.length > 0)
        {
            for(var externalSchemaIndex in externalSchemas)
            {
                var externalSchema = externalSchemas[externalSchemaIndex];
                tv4.addSchema(externalSchema.path, externalSchema.json);
            }
        }
        
        var validationResult = tv4.validateMultiple(json, schema);
        if(validationResult.missing.length > 0)
        {
            for(var missingIndex in validationResult.missing)
            {
                var missing = validationResult.missing[missingIndex];
                console.log("Missing reference to external schema: \"" + missing + "\"...");
            }
        }
        
		var result = { valid: validationResult.valid, errors: [], missingExternalSchemas: validationResult.missing };
		
		for(var errorIndex in validationResult.errors)
		{
			var currentError = validationResult.errors[errorIndex];
            var resultError =
            {
				message: currentError.message,
                dataPath: currentError.dataPath,
				schemaPath: currentError.schemaPath,
			};
            if(!resultError.dataPath)
            {
                resultError.dataPath = "/";
            }
            
			result.errors.push(resultError);
		}
		
		return result;
	}
}

module.exports.validateFile = validateFile;
function validateFile(jsonFilePath, schemaFilePath)
{
	var jsonString = getFileContents(jsonFilePath);
	var schemaString = getFileContents(schemaFilePath);
	
	var json = JSON.parse(jsonString);
	var schemaJson = JSON.parse(schemaString);
	
	return validate(json, schemaJson);
}

if(require.main === module)
{
	// commandLineArguments[0] is node.exe
	// commandLineArguments[1] is validateResourceSchema.js
	var jsonFilePath = getCommandLineArgument(2, "The first argument must be the path to the json file to validate.");
	var schemaFilePath = getCommandLineArgument(3, "The second argument must be the path to the schema file to use for validation.");
	
	var validationResult = validateFile(jsonFilePath, schemaFilePath);
	if(validationResult && validationResult.passed)
	{
		log("JSON validation passed");
	}
	else
	{
		log("JSON validation failed");
		for(var errorIndex in validationResult.errors)
		{
			if(errorIndex > 0)
			{
				log();
			}
			
			log("Error " + errorIndex + ":");
			log("\tMessage: \"" + validationResult.errors[errorIndex].message + "\"");
			log("\tSchema Path: " + validationResult.errors[errorIndex].schemaPath);
		}
	}
}