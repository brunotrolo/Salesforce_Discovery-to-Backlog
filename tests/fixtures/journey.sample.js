EXT.tabs2.push(['bscDoc','Busca por documento']);
var BSC={ok:false};
EXT.reset=function(){BSC.ok=false;};
EXT.render['bscDoc']=function(){
  return '<div class="sec-hdr"><div class="sec-ico">&#8801;</div><span style="font-size:13px;font-weight:600">Busca por documento</span></div>'
    +al('i','O documento nunca &#233; exibido completo na tela.')
    +'<div class="fgrid">'+fld('Documento','***.000.***-00')+'</div>'
    +'<div style="margin:10px 0">'+btn('Buscar','bscBuscar','btn-navy')+'</div>'
    +(BSC.ok?'<table class="ot"><thead><tr><th>Cliente</th><th>Produtos</th></tr></thead><tbody><tr><td>Cliente Exemplo Um</td><td>Cart&#227;o, Conta</td></tr></tbody></table>':'');
};
EXT.actions['bscBuscar']=function(){BSC.ok=true;};
