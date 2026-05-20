/// <mls fileReference="_102035_/l2/pizzaria/customerEditor.defs.ts"  enhancement="_blank"/>

export const definition = {
  "pages": [
    {
      "screenId": "_102035_",
      "pageName": "customerEditor",
      "actor": "staff",
      "purpose": "Create or edit customer profile for pizzaria ordering, including contact and delivery preferences.",
      "sections": [
        {
          "sectionName": "header",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "customerEditorHeader",
              "purpose": "Display page title and primary actions (save/cancel).",
              "rulesApplied": [
                "Provide clear edit/create context based on route param presence",
                "Disable save when form invalid or unchanged",
                "Show last updated metadata when available"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.pizzaria.customerDetail",
                "sourceRoutine": "pizzariaCustomers.getCustomer",
                "fields": [
                  {
                    "entityField": "id",
                    "entity": "customer",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "fullName",
                    "entity": "customer",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "status",
                    "entity": "customer",
                    "priority": "recommended",
                    "usage": "display"
                  },
                  {
                    "entityField": "updatedAt",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "updatedBy",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "display"
                  }
                ],
                "params": [
                  {
                    "paramName": "customerId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "customerId"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.customerEditor.isEditMode",
                  "type": "boolean",
                  "description": "Whether editing an existing customer (route has customerId).",
                  "priority": "required",
                  "initialValue": "route.customerId != null"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "customerEditorHeaderTitle",
                  "derivedFrom": [
                    "ui.customerEditor.isEditMode",
                    "db.pizzaria.customerDetail.fullName"
                  ],
                  "description": "Dynamic title for create vs edit.",
                  "priority": "required"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "customerEditorCancelNav",
                  "target": "/pizzaria/customers",
                  "params": [],
                  "priority": "required",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "customerEditor.saveRequested",
                  "payload": "{customerId:db.pizzaria.customerDetail.id}",
                  "writesState": "ui.customerEditor.save"
                }
              ]
            }
          ]
        },
        {
          "sectionName": "main",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "customerEditorForm",
              "purpose": "Edit customer identity, contact, and delivery preferences.",
              "rulesApplied": [
                "Validate required fields: full name, phone or email",
                "Normalize phone format and trim inputs",
                "Prevent duplicate customers by phone/email on save",
                "Autosave disabled; explicit save action"
              ],
              "dataShape": {
                "shape": "object",
                "stateKey": "db.pizzaria.customerDetail",
                "sourceRoutine": "pizzariaCustomers.getCustomer",
                "fields": [
                  {
                    "entityField": "id",
                    "entity": "customer",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "fullName",
                    "entity": "customer",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entityField": "phone",
                    "entity": "customer",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entityField": "email",
                    "entity": "customer",
                    "priority": "recommended",
                    "usage": "edit"
                  },
                  {
                    "entityField": "documentId",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "edit"
                  },
                  {
                    "entityField": "birthDate",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "edit"
                  },
                  {
                    "entityField": "notes",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "edit"
                  },
                  {
                    "entityField": "status",
                    "entity": "customer",
                    "priority": "recommended",
                    "usage": "edit"
                  },
                  {
                    "entityField": "preferredPaymentMethod",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "edit"
                  },
                  {
                    "entityField": "marketingOptIn",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "edit"
                  },
                  {
                    "entityField": "deliveryInstructions",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "edit"
                  },
                  {
                    "entityField": "createdAt",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "display"
                  },
                  {
                    "entityField": "updatedAt",
                    "entity": "customer",
                    "priority": "optional",
                    "usage": "display"
                  }
                ],
                "params": [
                  {
                    "paramName": "customerId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "customerId"
                    }
                  }
                ]
              },
              "tempStates": [
                {
                  "stateKey": "ui.customerEditor.formDirty",
                  "type": "boolean",
                  "description": "Tracks if form has unsaved changes.",
                  "priority": "required",
                  "initialValue": "false"
                },
                {
                  "stateKey": "ui.customerEditor.validationErrors",
                  "type": "object",
                  "description": "Field-level validation errors keyed by field name.",
                  "priority": "recommended",
                  "initialValue": "{}"
                },
                {
                  "stateKey": "ui.customerEditor.primaryContactChoice",
                  "type": "string",
                  "description": "Preferred contact channel used in validation.",
                  "priority": "optional",
                  "initialValue": "'phone'"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "customerEditorIsValid",
                  "derivedFrom": [
                    "db.pizzaria.customerDetail.fullName",
                    "db.pizzaria.customerDetail.phone",
                    "db.pizzaria.customerDetail.email",
                    "ui.customerEditor.validationErrors"
                  ],
                  "description": "Form validity considering required fields and errors.",
                  "priority": "required"
                },
                {
                  "fieldId": "customerEditorCanSave",
                  "derivedFrom": [
                    "customerEditorIsValid",
                    "ui.customerEditor.formDirty",
                    "ui.customerEditor.saveState"
                  ],
                  "description": "Enable save only when valid, dirty, and not loading.",
                  "priority": "required"
                }
              ],
              "navigationFields": [
                {
                  "fieldId": "customerEditorAfterSaveNav",
                  "target": "/pizzaria/customers/:customerId",
                  "params": [
                    "db.pizzaria.customerDetail.id"
                  ],
                  "priority": "recommended",
                  "navigationType": "internal"
                }
              ],
              "emits": [
                {
                  "event": "customerEditor.fieldChanged",
                  "payload": "{field,value}",
                  "writesState": "ui.customerEditor.formDirty"
                },
                {
                  "event": "customerEditor.validate",
                  "payload": "{fields:db.pizzaria.customerDetail}",
                  "writesState": "ui.customerEditor.validationErrors"
                },
                {
                  "event": "customerEditor.submit",
                  "payload": "{customer:db.pizzaria.customerDetail}",
                  "writesState": "ui.customerEditor.save"
                }
              ]
            }
          ]
        },
        {
          "sectionName": "aside",
          "mode": "stack",
          "organisms": [
            {
              "organismName": "customerEditorAddresses",
              "purpose": "Manage customer delivery addresses list.",
              "rulesApplied": [
                "Allow adding, editing, deleting addresses",
                "Mark one address as default",
                "Validate required address fields"
              ],
              "dataShape": {
                "shape": "collection",
                "stateKey": "db.pizzaria.customerDetail.addresses[]",
                "sourceRoutine": "pizzariaCustomers.listAddresses",
                "itemFields": [
                  {
                    "entityField": "id",
                    "entity": "address",
                    "priority": "required",
                    "usage": "display"
                  },
                  {
                    "entityField": "label",
                    "entity": "address",
                    "priority": "recommended",
                    "usage": "edit"
                  },
                  {
                    "entityField": "street",
                    "entity": "address",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entityField": "number",
                    "entity": "address",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entityField": "complement",
                    "entity": "address",
                    "priority": "optional",
                    "usage": "edit"
                  },
                  {
                    "entityField": "district",
                    "entity": "address",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entityField": "city",
                    "entity": "address",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entityField": "state",
                    "entity": "address",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entityField": "postalCode",
                    "entity": "address",
                    "priority": "required",
                    "usage": "edit"
                  },
                  {
                    "entityField": "isDefault",
                    "entity": "address",
                    "priority": "recommended",
                    "usage": "edit"
                  }
                ],
                "params": [
                  {
                    "paramName": "customerId",
                    "type": "string",
                    "source": {
                      "from": "route",
                      "routeParam": "customerId"
                    }
                  }
                ],
                "editable": true
              },
              "tempStates": [
                {
                  "stateKey": "ui.customerEditor.addresses.selectedId",
                  "type": "string",
                  "description": "Currently selected address for editing.",
                  "priority": "optional",
                  "initialValue": "''"
                }
              ],
              "computedFields": [
                {
                  "fieldId": "customerEditorDefaultAddress",
                  "derivedFrom": [
                    "db.pizzaria.customerDetail.addresses[]"
                  ],
                  "description": "Resolve default address for display badges.",
                  "priority": "recommended"
                }
              ],
              "navigationFields": [],
              "emits": [
                {
                  "event": "customerEditor.addressAdded",
                  "payload": "{address}",
                  "writesState": "ui.customerEditor.formDirty"
                },
                {
                  "event": "customerEditor.addressUpdated",
                  "payload": "{addressId,patch}",
                  "writesState": "ui.customerEditor.formDirty"
                },
                {
                  "event": "customerEditor.addressDeleted",
                  "payload": "{addressId}",
                  "writesState": "ui.customerEditor.formDirty"
                }
              ]
            }
          ]
        }
      ],
      "actionStates": [
        {
          "stateKey": "ui.customerEditor.load",
          "description": "Loading customer data.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.customerEditor.save",
          "description": "Saving customer changes.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        },
        {
          "stateKey": "ui.customerEditor.delete",
          "description": "Deleting customer.",
          "values": [
            "idle",
            "loading",
            "success",
            "error"
          ]
        }
      ],
      "tempStates": [
        {
          "stateKey": "ui.customerEditor.toast",
          "type": "object",
          "description": "Transient notifications for success/error.",
          "priority": "optional",
          "initialValue": "{message:'',type:''}"
        },
        {
          "stateKey": "ui.customerEditor.activeTab",
          "type": "string",
          "description": "Currently active form tab (details/addresses/notes).",
          "priority": "optional",
          "initialValue": "'details'"
        }
      ]
    }
  ],
  "status": "draft"
}

export const contractSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/customerEditor.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`
`

export const sharedSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/customerEditor.defs.ts).definition]]
\`\`\`

## Ontology
\`\`\`JSON
    [[(_102035_/l1/pizzaria/module.ts)]]
\`\`\`

`

export const desktopLayoutSpec = `
## Pages spec
\`\`\`JSON
    [[(_102035_/l2/pizzaria/customerEditor.defs.ts).definition]]
\`\`\`

## Base Class
\`\`\`JSON
    [[(_102035_/l2/pizzaria/web/shared/customerEditor.ts)]]
\`\`\`
`

export const materializeIndex = [
  {
    "id": "contract",
    "specVar": "contractSpec",
    "outputPath": "/l1/pizzaria/layer_2_controller/customerEditor.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genContract.ts",
    "agent": "agentMaterializeContract",
    "dependsOn": [],
    "specUpdatedAt": "2026-05-20T21:41:12Z"
  },
  {
    "id": "shared",
    "specVar": "sharedSpec",
    "outputPath": "/l2/pizzaria/web/shared/customerEditor.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageShared.ts",
    "agent": "agentMaterializeSharedPage",
    "dependsOn": [
      "contract"
    ],
    "specUpdatedAt": "2026-05-20T21:41:12Z"
  },
  {
    "id": "desktop",
    "specVar": "desktopLayoutSpec",
    "outputPath": "/l2/pizzaria/web/desktop/page11/customerEditor.ts",
    "skillPath": "_102020_/l2/agents/newModule/skills/genPageRender.ts",
    "agent": "agentMaterializePageLit",
    "dependsOn": [
      "contract",
      "shared"
    ],
    "specUpdatedAt": "2026-05-20T21:41:12Z"
  }
]
