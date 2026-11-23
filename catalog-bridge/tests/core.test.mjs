import test from "node:test";
import assert from "node:assert/strict";
import {handlePublicCatalog,projectPublicCatalog,WILLOW_SOURCE} from "../core.mjs";

const service = {id:"WCS-SVC-001",kind:"service",name:"Initial residential",
  category:"Residential",method:"Hourly",unit:"USD / crew-hour",
  lifecycle:"Active now",enabled:true,rate_cents:5000,
  owner_private_notes:"PRIVATE SHOULD NEVER ESCAPE"};
const fixture = {ok:true,schema:"wms-pricebook-public/1",revision:7,
  permissions:{can_edit:false},records:[service],internal_only:"DO NOT FORWARD"};
const request = method => new Request("https://willowlab.example/api/willow-catalog",{method});
const upstream = () => new Response(JSON.stringify(fixture),{status:200,headers:{"Content-Type":"application/json"}});
test("always refuses unsafe methods before contacting upstream",async()=>{
  let called=false;
  const result=await handlePublicCatalog(request("POST"),{WILLOW_CATALOG_READ_ENABLED:"true"},()=>{called=true;return upstream();});
  assert.equal(result.status,405);assert.equal(called,false);
});
test("disabled by default and does not contact Colton",async()=>{
  let called=false;
  const result=await handlePublicCatalog(request("GET"),{},()=>{called=true;return upstream();});
  assert.equal(result.status,503);assert.equal(called,false);
});
test("public projection strictly omits rates and unknown source fields",()=>{
  const projected=projectPublicCatalog(fixture);
  assert.deepEqual(projected.records,[{id:service.id,name:service.name,category:service.category,method:service.method,unit:service.unit}]);
  assert.equal(JSON.stringify(projected).includes("PRIVATE"),false);
  assert.equal(JSON.stringify(projected).includes("5000"),false);
});
test("approved GET reaches only fixed public endpoint and produces no-store output",async()=>{
  let fetched;
  const r=await handlePublicCatalog(request("GET"),{WILLOW_CATALOG_READ_ENABLED:"true"},async(url,options)=>{
    fetched={url,options};return upstream();
  });
  assert.equal(r.status,200);assert.equal(r.headers.get("Cache-Control"),"no-store, private");
  assert.equal(fetched.url,WILLOW_SOURCE);
  assert.equal(fetched.options.method,"GET");
  assert.equal(fetched.options.redirect,"manual");
  assert.equal(fetched.options.headers.Accept,"application/json");
  const data=await r.json();assert.equal(data.revision,7);assert.equal(data.records.length,1);
  assert.equal(JSON.stringify(data).includes("PRIVATE"),false);
});
test("owner-editable and malformed projections fail closed",()=>{
  assert.throws(()=>projectPublicCatalog({...fixture,permissions:{can_edit:true}}));
  assert.throws(()=>projectPublicCatalog({...fixture,records:[{...service,kind:"pay_model"}]}));
  assert.throws(()=>projectPublicCatalog({...fixture,records:[service,service]}));
  assert.throws(()=>projectPublicCatalog({...fixture,schema:"wms-pricebook-private/1"}));
});
test("upstream redirect, forbidden response, HTML, or parse error never escape upstream content",async()=>{
  for (const [status,body,type] of [[302,"secret","application/json"],[403,"secret","application/json"],[200,"<html>private</html>","text/html"],[200,"{broken","application/json"]]){
    const response=await handlePublicCatalog(request("GET"),{WILLOW_CATALOG_READ_ENABLED:"true"},
      async()=>new Response(body,{status,headers:{"content-type":type}}));
    assert.equal(response.status,502);assert.equal((await response.text()).includes("secret"),false);
  }
});
test("network outage fails closed and provides no booking behavior",async()=>{
  const response=await handlePublicCatalog(request("GET"),{WILLOW_CATALOG_READ_ENABLED:"true"},async()=>{throw Error("Upstream secret details")});
  assert.equal(response.status,502);assert.equal((await response.text()).includes("secret"),false);
});
