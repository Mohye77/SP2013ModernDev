<%@ Assembly Name="IFS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=4bb36518cdb605fa" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="IFS" TagName="MainFooter" Src="~/_CONTROLTEMPLATES/15/IFS/UC_MainFooter.ascx" %>
<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="UC_Contact.ascx.cs" Inherits="IFS.ControlTemplates.UC_Contact" %>

<div id="contact-form">
    <!-- #page -->
    <section id="page">
        <!-- #header -->
        <header id="header">
            <div id="header-logo">
                <a href="<%=WebUrl %>">
                    <img src="/style%20library/ifs/images/logos/logo_edr_blue.svg" alt="Edmond de Rothschild">
                </a>
            </div>

            <div id="header-content">
                <div id="header-title">
                    <h1><%=SiteTitle_Label %></h1>
                </div>
            </div>

        </header>
        <!-- end #header -->

        <!-- #content -->
        <section id="content">

            <!-- #sidebar -->
            <aside id="sidebar">
                <header class="sidebar-header">
                    <a href="<%=WebUrl %>" class="link-back icon-arrow-left"><%=RetourListDesFonds_Label %></a>
                </header>

                <footer class="sidebar-footer">

                    <address>
                        <p>
                            <asp:Literal runat="server" ID="litContactTitle" Text="EDMOND DE ROTHSCHILD ASSET MANAGEMENT FR - fr"></asp:Literal>
                        </p>
                        <p>
                            <asp:Literal runat="server" ID="litContactAdresse" Text="47 rue du Faubourg Saint-Honoré<br />75008 Paris - France"></asp:Literal>
                        </p>
                        <p>
                            <asp:Literal runat="server" ID="litContactTelephone" Text="+33 1 40 17 25 25"></asp:Literal>
                        </p>
                    </address>
                </footer>
            </aside>
            <!-- end #sidebar -->

            <!-- #main -->
            <main id="main">

                <div class="content-block">

                    <div class="container-fluid">

                        <div class="row">
                            <div class="col-sm-10 col-sm-offset-1 col-lg-8 col-lg-offset-2">
								<p class="lead">If you would like more information, please complete and submit the contact form below. We will get back to you as quickly as possible.</p>
                                <h2><%=Contact_Label %></h2>

                                <asp:Panel id="pnlErrorMsg" CssClass="alert alert-danger" runat="server" Visible="false">
                                    <%=ErrorMsg_Label %>
                                </asp:Panel>
                                <asp:Panel id="pnlSuccessMsg" CssClass="alert alert-success" runat="server" Visible="false">
                                    <%=SuccessMsg_Label %>
                                </asp:Panel>
                                <fieldset>
                                    <div class="row">
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <asp:TextBox CssClass="form-control" runat="server" ID="txtLastName"></asp:TextBox>
                                            </div>
                                        </div>
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <asp:TextBox CssClass="form-control" runat="server" ID="txtFirstName"></asp:TextBox>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <asp:TextBox CssClass="form-control" TextMode="Email" runat="server" ID="txtEmail"></asp:TextBox>
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset>
                                    <legend><%=Coordonnees_Label %></legend>
                                    <div class="row">
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <asp:DropDownList CssClass="form-control" runat="server" ID="ddlCountry"></asp:DropDownList>
                                            </div>
                                        </div>
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <asp:TextBox CssClass="form-control" runat="server" ID="txtPhoneNumber"></asp:TextBox>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-sm-12">
                                            <div class="form-group">
                                                <asp:TextBox CssClass="form-control" runat="server" ID="txtAddress"></asp:TextBox>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <asp:TextBox CssClass="form-control" runat="server" ID="txtZipCode"></asp:TextBox>
                                            </div>
                                        </div>
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <asp:TextBox CssClass="form-control" runat="server" ID="txtCity"></asp:TextBox>
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>
                                <fieldset>
                                    <legend><%=MessageIntro_Label %></legend>
                                    <asp:TextBox CssClass="form-control" TextMode="MultiLine" Rows="10" runat="server" ID="txtMessage"></asp:TextBox>
                                </fieldset>

                                <div class="form-btn">
                                    <asp:LinkButton runat="server" ID="btnSend" CssClass="btn btn-primary" OnClick="btnSend_Click"></asp:LinkButton>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

				<div class="container-fluid">
               		<IFS:MainFooter runat="server" ShowDisclaimer="False"></IFS:MainFooter>
				</div>

            </main>
            <!-- end #main -->

        </section>
        <!-- end #content -->

    </section>
    <!-- end #page -->

</div>
