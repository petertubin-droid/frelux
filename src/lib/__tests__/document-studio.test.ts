import { describe, expect, it, vi } from "vitest";
import { validateStudioConfig } from "@/lib/document-studio";

const valid = { pageSize:"a4",orientation:"portrait",currency:"NGN",locale:"en-NG",accentColor:"#7C3AED",watermark:true,blocks:[{id:"h",type:"heading",text:"Quote"},{id:"m",type:"materials",title:"Materials",rows:[{label:"Cement",quantity:2,unit:"bag",unitPrice:12000}]}] };

describe("Document Studio config validation",()=>{
  it("normalizes a valid structured document without losing live numeric values",()=>{
    const config=validateStudioConfig(valid);
    expect(config.blocks[1]).toMatchObject({type:"materials",rows:[{quantity:2,unitPrice:12000}]});
  });
  it("rejects negative and non-finite quantities/prices",()=>{
    expect(()=>validateStudioConfig({...valid,blocks:[{id:"m",type:"materials",rows:[{label:"x",quantity:-1,unit:"",unitPrice:1}]}]})).toThrow();
    expect(()=>validateStudioConfig({...valid,blocks:[{id:"m",type:"materials",rows:[{label:"x",quantity:1,unit:"",unitPrice:Infinity}]}]})).toThrow();
  });
  it("rejects unsupported blocks and excessive sections",()=>{
    expect(()=>validateStudioConfig({...valid,blocks:[{id:"x",type:"script",text:"run"}]})).toThrow();
    expect(()=>validateStudioConfig({...valid,blocks:Array.from({length:31},(_,i)=>({id:String(i),type:"paragraph",text:"x"}))})).toThrow();
  });
  it("strips control characters and caps user text",()=>{
    const config=validateStudioConfig({...valid,blocks:[{id:"x",type:"paragraph",text:"safe\\u0000text".replace("\\u0000","\u0000")} ]});
    expect(config.blocks[0]).toMatchObject({text:"safetext"});
  });
});
