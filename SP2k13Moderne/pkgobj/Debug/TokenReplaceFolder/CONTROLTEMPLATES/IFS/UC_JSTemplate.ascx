<%@ Assembly Name="IFS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=4bb36518cdb605fa" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register Tagprefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register Tagprefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register Tagprefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %> 
<%@ Register Tagprefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="UC_JSTemplate.ascx.cs" Inherits="IFS.ControlTemplates.UC_JSTemplate" %>


<script type="text/javascript">
	var jsTexts =
	{
		leaveWebsiteConfirm: "Vous êtes sur le point de quitter le site. Confirmez-vous ce choix ?"
	}
</script>

<script id="fund-performance-tpl" type="text/x-jsrender">
						
	<table class="table table-hover table-bordered performance-table">
		<thead>
			<tr>
				<th class="text-right">{{:NomPart}}</th>
				<th><%=CumulativePerf_Label %></th>
				<th><%=AnnualisedPerf_Label %></th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<th>Depuis le début de l'année</th>
				<td><span class="val">{{:PerfYTD}}</span></td>
				<td><span class="val">{{:PerfYTD}}</span></td>
			</tr>
			<tr>
				<th><%=Perf1Y_Label %></th>
				<td><span class="val">{{:Perf1Y}}</span></td>
				<td><span class="val">{{:Perf1YAnnualized}}</span></td>
			</tr>
			<tr>
				<th><%=Perf3Y_Label %></th>
				<td><span class="val">{{:Perf3Y}}</span></td>
				<td><span class="val">{{:Perf3YAnnualized}}</span></td>
			</tr>
			<tr>
				<th><%=Perf5Y_Label %></th>
				<td><span class="val">{{:Perf5Y}}</span></td>
				<td><span class="val">{{:Perf5YAnnualized}}</span></td>
			</tr>
			<tr>
				<th><%=DateInception_Label %></th>
				<td><span class="val">{{:PerfDepuisLancement}}</span></td>
				<td><span class="val">{{:PerfDepuisLancementAnnualisee}}</span></td>
			</tr>
		</tbody>
	</table>
</script>

<script id="fund-characteristics-tpl" type="text/x-jsrender">
	<div class="row">
		<div class="col-lg-4">
			<ul>
				{{if DateCreationFondsFormatted}}
				<li>
					<span><%=CreationDate_Label %> :</span>
					<strong>{{:DateCreationFondsFormatted}}</strong>
				</li>
				{{/if}}
				
				{{if DateCreationPartFormatted}}							
				<li>
					<span><%=CreationDatePart_Label %> :</span>
					<strong>{{:DateCreationPartFormatted}}</strong>
				</li>
				{{/if}}

				{{if NatureJuridique}}							
				<li>
					<span><%=LegalForm_Label %> :</span>
					<strong>{{:NatureJuridique}}</strong>
				</li>
				{{/if}}
				
				{{if LibelleIndice}}							
				<li>
					<span><%=Index_Label %> :</span>
					<strong>{{:LibelleIndice}}</strong>
				</li>
				{{/if}}

				{{if ActifNetDeviseF}}							
				<li>
					<span><%=CurrencyFund_Label %> :</span>
					<strong>{{:ActifNetDeviseF}}</strong>
				</li>
				{{/if}}

				{{if ActifNetDeviseP}}							
				<li>
					<span><%=CurrencyShareClass_Label %> :</span>
					<strong>{{:ActifNetDeviseP}}</strong>
				</li>
				{{/if}}

				{{if AffectationResultats}}							
				<li>
					<span><%=DistributionPolicy_Label %> :</span>
					<strong>{{:AffectationResultats}}</strong>
				</li>
				{{/if}}

			</ul>
		</div>
		<div class="col-lg-4">
			<ul>
				{{if FrequenceVL}}							
				<li>
					<span><%=ValuationFrequency_Label %> :</span>
					<strong>{{:FrequenceVL}}</strong>
				</li>
				{{/if}}

				{{if InvestissementMinimumInitial}}							
				<li>
					<span><%=MinimumInvestment_Label %> :</span>
					<strong>{{:InvestissementMinimumInitial}}</strong>
				</li>
				{{/if}}

				{{if PEA}}							
				<li>
					<span><%=PEA_Label %> :</span>
					<strong>{{:PEA}}</strong>
				</li>
				{{/if}}

				{{if PaysDomicile}}							
				<li>
					<span><%=Incorporation_Label %> :</span>
					<strong>{{:PaysDomicile}}</strong>
				</li>
				{{/if}}

				{{if Isin}}							
				<li>
					<span><%=IsinCode_Label %> :</span>
					<strong>{{:Isin}}</strong>
				</li>
				{{/if}}

				{{if ActifNetFMillion}}							
				<li>
					<span><%=AuMFund_Label %> :</span>
					<strong>{{:ActifNetFMillion}}</strong>
				</li>
				{{/if}}

				{{if OrganismeTutelle}}							
				<li>
					<span><%=RegulationAuthority_Label %> :</span>
					<strong>{{:OrganismeTutelle}}</strong>
				</li>
				{{/if}}

				{{if TypeOpc}}							
				<li>
					<span><%=EURegulation_Label %> :</span>
					<strong>{{:TypeOpc}}</strong>
				</li>
				{{/if}}

			</ul>
		</div>
		<div class="col-lg-4">
			<ul>
				{{if SocieteDeGestion}}							
				<li>
					<span><%=ManagementCompany_Label %> :</span>
					<strong>{{:SocieteDeGestion}}</strong>
				</li>
				{{/if}}

				{{if SocieteDeGestionDelegee}}							
				<li>
					<span><%=DelegatedManagementCompany_Label %> :</span>
					<strong>{{:SocieteDeGestionDelegee}}</strong>
				</li>
				{{/if}}

				{{if MarketRepresentant}}							
				<li>
					<span><%=RepresentativeAgent_Label %> :</span>
					<strong>{{:MarketRepresentant}}</strong>
				</li>
				{{/if}}

				{{if MarketAgentPayeur}}							
				<li>
					<span><%=PayingAgent_Label %> :</span>
					<strong>{{:MarketAgentPayeur}}</strong>
				</li>
				{{/if}}

				{{if Gerants}}							
				<li>
					<span><%=Managers_Label %> :</span>
					<strong>
						{{for Gerants}}
							<span>{{:NomPrenom}}</span>
						{{/for}}
					</strong>
				</li>
				{{/if}}
				
				{{if FraisGestion}}							
				<li>
					<span><%=MaxManagementFee_Label %> :</span>
					<strong>{{:FraisGestion}}</strong>
				</li>
				{{/if}}

				{{if FraisGestionReel}}							
				<li>
					<span><%=CurManagementFee_Label %> :</span>
					<strong>{{:FraisGestionReel}}</strong>
				</li>
				{{/if}}

				{{if ConditionsDeSouscriptionEtRachat}}							
				<li>
					<span><%=ConditionSubscriptionPurchase_Label %> :</span>
					<strong>{{:ConditionsDeSouscriptionEtRachat}}</strong>
				</li>
				{{/if}}

				{{if CommissionSouscription}}							
				<li>
					<span><%=SubscriptionFee_Label %> :</span>
					<strong>{{:CommissionSouscription}}</strong>
				</li>
				{{/if}}

				{{if CommissionRachat}}			
                <li>				
					<span><%=RedemptionFee_Label%> :</span>
					<strong>{{:CommissionRachat}}</strong>
				</li>
				{{/if}}
				
				{{if CommissionSuperformance}}							
				<li>
					<span><%=PerformanceFee_Label %> :</span>
					<strong>{{:CommissionSuperformance}}</strong>
				</li>
				{{/if}}
			</ul>
		</div>
	</div>
</script>

<script id="fund-documents-tpl" type="text/x-jsrender">
	{{if documents}}
		<div class="row inline-block-cols">
			{{for documents}}
			<div class="col-sm-6 col-lg-4">
				<h3>{{:LangueDrapeau}}</h3>

				<div class="form-group checkboxes">
					{{for group}}
						<div class="checkbox">
							<label>
								{{if IsExterne}}
									<a href="{{:UrlFichier}}" target="_blank">{{:Libelle}}</a>
								{{else}}
									<input type="checkbox" value="{{:UrlFichier}}" />
									<span class="custom-form-control"></span>
									<span class="name">{{:Libelle}}</span>
								{{/if}}
									<span class="date">{{:DateProductionFormatted}}</span>
							</label>
						</div>
					{{/for}}
				</div>
			</div>
			{{/for}}
		</div>
			
		<div class="form-btn">
			<div class="checkbox">
				<label>
					<input id="input-select-all-documents" type="checkbox" />
					<span class="custom-form-control"></span>
					<%=ToutSelectionner_Label %>
				</label>
			</div>
			<a href="#" id="btn-fund-documents-download" class="btn btn-primary"><%=Telecharger_Label %></a>
		</div>
	{{/if}}

</script>
