
import fs from 'fs'
import { SchemaDefinition, SchemaField, FieldType } from 'stream-sea-client/dist/types'

export const isPath = (path:string):boolean => /^(\.?\.?\/|[\d?\w])/ig.test(path)
export const isJSON = (json:string):boolean => /^(({.*})|(\[.*\]))$/sg.test(json)

export const loadInlinePayload = (dataString:string) => {
  if(!dataString) {
    throw new Error('Data argument should not be empty')
  }
  dataString = dataString.trim()
  if(isPath(dataString)) {
    return JSON.parse(fs.readFileSync(dataString, 'utf8'))
  } else if(isJSON(dataString)) {
    return JSON.parse(dataString)
  } else {
    throw new Error('Unexpected format for the data argument. Expected path to a file or a JSON string.')
  }
}

export const parseUnstructuredSchema = (unstructuredSchema:any) => {
  const fields:SchemaField[] = []
  for(var fieldName in unstructuredSchema) {
    if(fieldName === '_version') {
      continue
    }
    if(typeof unstructuredSchema[fieldName] === 'string') {
      fields.push({
        name: fieldName,
        type: unstructuredSchema[fieldName]
      })
    } else if(Array.isArray(unstructuredSchema[fieldName])) {
      fields.push({
        name: fieldName,
        type: FieldType.OBJECT_ARRAY,
        fields: parseUnstructuredSchema(unstructuredSchema[fieldName][0])
      })
    } else if(typeof unstructuredSchema[fieldName] === 'object') {
      fields.push({
        name: fieldName,
        type: FieldType.OBJECT,
        fields: parseUnstructuredSchema(unstructuredSchema[fieldName])
      })
    } else {
      throw new Error(`Unrecognized field definition ${unstructuredSchema[fieldName]}`)
    }
  }

  return fields

}

export const formatShortJSONSchema = (schemaName:string, unstructuredSchema:any) => {
  const schema:SchemaDefinition = {
    version: 1,
    name: schemaName,
    fields: parseUnstructuredSchema(unstructuredSchema)
  }
  if(unstructuredSchema._version) {
    schema.version = unstructuredSchema._version
  }
  return schema
}

export const formatLongJSONSchema = (schemaName:string, unstructuredSchema: any) => {
  return unstructuredSchema as SchemaDefinition // TODO: validation
}